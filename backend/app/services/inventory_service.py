import re

from sqlalchemy import table, column, select, update, insert, String, or_, func
from sqlalchemy.sql.expression import cast
from typing import Optional, Dict, Any, List

from .database_service import DatabaseService
from ..models.manifest import MappingManifest, TableMap

class InventoryService:
    """
    Brand-agnostic service for executing inventory operations against legacy databases.
    Uses SQLAlchemy Core to generate dialect-independent SQL queries based on a mapping manifest.
    """
    def __init__(self, db_service: DatabaseService):
        self.db_service = db_service

    def _get_table_config(self, manifest: MappingManifest, logical_table: str) -> TableMap:
        if logical_table not in manifest.tables:
            raise ValueError(f"Table '{logical_table}' not found in mapping manifest.")
        return manifest.tables[logical_table]

    def _build_table(self, config: TableMap):
        """
        Builds the Core selectable with every mapped physical column attached to it.
        The columns have to belong to the table: free-standing column() objects compile
        into a SELECT with no FROM clause, and leave UPDATE/INSERT with nothing to bind.
        """
        return table(
            config.physical_name,
            *[column(col.physical_name) for col in config.columns.values()],
        )

    def _col(self, tbl, config: TableMap, logical_name: str):
        """Resolves one of our logical column names to the bound physical column."""
        if logical_name not in config.columns:
            raise ValueError(
                f"Column '{logical_name}' is not mapped for table '{config.logical_name}'."
            )
        return tbl.c[config.columns[logical_name].physical_name]

    # LIKE reads these as pattern syntax, not as text, so a search for "50%" or
    # "part_1" has to escape them or it matches far more than was asked for — and a
    # term of "%" alone matches every row in the table. Standard SQL only guarantees
    # that the wildcards and the escape character itself can be escaped, so those are
    # all we touch; '/' is used rather than a backslash, which MySQL treats specially
    # in string literals of its own accord.
    _LIKE_ESCAPE = "/"

    @classmethod
    def _contains(cls, col, term: str):
        """Dialect-independent "this column contains this literal text"."""
        marker = cls._LIKE_ESCAPE
        literal = (
            term.replace(marker, marker * 2)
            .replace("%", marker + "%")
            .replace("_", marker + "_")
        )
        # Cast to string so the comparison also works against numeric columns.
        return cast(col, String).ilike(f"%{literal}%", escape=marker)

    @classmethod
    def _match_any(cls, columns, terms: List[str]):
        """OR of "contains" across every searchable column and every term."""
        return or_(*[cls._contains(col, term) for col in columns for term in terms])

    @staticmethod
    def _search_terms(search_term: str) -> List[str]:
        """
        The whole phrase, each significant word in it, and the singular stem of any
        plural word.

        Searching only the whole phrase misses the product when the user's wording
        differs slightly from the stored text, e.g. "security cameras" against
        "4K Security Camera Dome". The stems matter for the same reason: matching is
        substring-based, so "bolts" does not find "Hex Bolt M8 Stainless" and the
        question "how many bolts do we have" came back as a confident 0 against a
        database holding 8,950 of them. A stem is only ever a prefix of the word it
        came from, so it widens the match without inventing one.
        """
        phrase = search_term.strip()
        terms = [phrase] if phrase else []
        seen = {t.lower() for t in terms}

        def add(candidate: str) -> None:
            if len(candidate) >= 3 and candidate.lower() not in seen:
                terms.append(candidate)
                seen.add(candidate.lower())

        for word in re.split(r"[^\w]+", phrase):
            add(word)
            lowered = word.lower()
            if len(word) >= 5 and lowered.endswith("es"):
                add(word[:-2])
            elif len(word) >= 4 and lowered.endswith("s"):
                add(word[:-1])

        return terms

    async def fuzzy_search_product(self, tenant_id: str, connection_string: str, manifest: MappingManifest, search_term: str) -> List[Dict[str, Any]]:
        """
        Uses SQL LIKE to find SKUs matching the search term asynchronously.
        Searches the product description too when the manifest maps one, because
        legacy SKU codes rarely contain the words people actually search by.
        """
        config = self._get_table_config(manifest, "inventory")

        tbl = self._build_table(config)
        col_sku = self._col(tbl, config, "sku")

        columns = [col_sku]
        if "description" in config.columns:
            columns.append(self._col(tbl, config, "description"))

        terms = self._search_terms(search_term)
        if not terms:
            return []

        stmt = select(*columns).where(self._match_any(columns, terms)).distinct().limit(10)

        return await self.db_service.execute_query(tenant_id, connection_string, stmt)

    async def get_stock_total(self, tenant_id: str, connection_string: str, manifest: MappingManifest, search_term: str) -> Dict[str, Any]:
        """
        Totals on-hand quantity across every matching product and location.

        The aggregation is done by the database rather than left to the agent.
        Asked for a total, the model used to call the per-row tools and add the
        results up itself, which it did unreliably: it dropped a small row on one
        fixture and mis-added two correct subtotals on another. SUM and GROUP BY
        are exact, dialect-independent, and one round trip.
        """
        config = self._get_table_config(manifest, "inventory")

        tbl = self._build_table(config)
        col_sku = self._col(tbl, config, "sku")
        col_qty = self._col(tbl, config, "quantity")

        columns = [col_sku]
        if "description" in config.columns:
            columns.append(self._col(tbl, config, "description"))

        terms = self._search_terms(search_term)
        if not terms:
            return {"total_quantity": 0, "per_sku": []}

        stmt = (
            select(col_sku.label("sku"), func.sum(col_qty).label("quantity"))
            .where(self._match_any(columns, terms))
            .group_by(col_sku)
        )

        rows = await self.db_service.execute_query(tenant_id, connection_string, stmt)

        # SUM() comes back as a Decimal on MySQL where PostgreSQL and SQLite hand
        # back a plain int, and Decimal is not JSON serialisable — which the tool
        # layer only discovers when it tries to hand the result to the agent.
        # Normalise here so every dialect returns the same shape.
        per_sku = [
            {"sku": row["sku"], "quantity": int(row["quantity"] or 0)}
            for row in rows
        ]
        # Python's arithmetic is exact; it was only the model's that was not.
        total = sum(entry["quantity"] for entry in per_sku)

        return {"total_quantity": total, "per_sku": per_sku}

    async def get_inventory_stock(self, tenant_id: str, connection_string: str, manifest: MappingManifest, sku: str, location_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Resolves physical names from manifest and safely queries stock asynchronously.
        """
        config = self._get_table_config(manifest, "inventory")

        tbl = self._build_table(config)
        col_sku = self._col(tbl, config, "sku")
        col_qty = self._col(tbl, config, "quantity")

        stmt = select(col_qty)
        conditions = [col_sku == sku]

        if "location_id" in config.columns:
            col_loc = self._col(tbl, config, "location_id")
            # Stock is held per location, so always report which location a figure is for.
            stmt = select(col_qty, col_loc)
            if location_id:
                conditions.append(col_loc == location_id)

        stmt = stmt.where(*conditions)

        return await self.db_service.execute_query(tenant_id, connection_string, stmt)

    async def update_inventory_stock(self, tenant_id: str, connection_string: str, manifest: MappingManifest, sku: str, quantity_change: int, location_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Adjusts stock levels securely based on the mapping asynchronously.
        A deduction is refused rather than allowed to drive on-hand quantity negative.
        """
        config = self._get_table_config(manifest, "inventory")

        tbl = self._build_table(config)
        col_sku = self._col(tbl, config, "sku")
        col_qty = self._col(tbl, config, "quantity")

        conditions = [col_sku == sku]

        if location_id and "location_id" in config.columns:
            col_loc = self._col(tbl, config, "location_id")
            conditions.append(col_loc == location_id)

        if quantity_change < 0:
            # Applied in SQL rather than read-then-write, so concurrent adjustments
            # cannot race past the check.
            conditions.append(col_qty >= -quantity_change)

        stmt = update(tbl).where(*conditions).values({col_qty.name: col_qty + quantity_change})

        result = await self.db_service.execute_query(tenant_id, connection_string, stmt)

        if result.get("rowcount", 0) == 0:
            where = f" at location '{location_id}'" if location_id else ""
            if quantity_change < 0:
                raise ValueError(
                    f"Cannot deduct {-quantity_change} of '{sku}'{where}: no matching "
                    "stock record, or not enough stock on hand."
                )
            raise ValueError(f"No stock record found for '{sku}'{where}.")

        return result

    async def transfer_inventory_stock(self, tenant_id: str, connection_string: str, manifest: MappingManifest, sku: str, quantity: int, from_location_id: str, to_location_id: str) -> Dict[str, Any]:
        """
        Moves stock safely between two distinct locations asynchronously.
        Both legs run in one transaction, so a transfer either completes or leaves
        the data untouched: stock is never deducted from the source and then lost
        because the destination could not take it.
        """
        if quantity <= 0:
            raise ValueError("Transfer quantity must be greater than zero.")
        if from_location_id == to_location_id:
            raise ValueError("Source and destination locations must be different.")

        config = self._get_table_config(manifest, "inventory")

        if "location_id" not in config.columns:
            raise ValueError("Transfers need a mapped 'location_id' column.")

        tbl = self._build_table(config)
        col_sku = self._col(tbl, config, "sku")
        col_qty = self._col(tbl, config, "quantity")
        col_loc = self._col(tbl, config, "location_id")

        deduct = (
            update(tbl)
            .where(col_sku == sku, col_loc == from_location_id, col_qty >= quantity)
            .values({col_qty.name: col_qty - quantity})
        )
        add = (
            update(tbl)
            .where(col_sku == sku, col_loc == to_location_id)
            .values({col_qty.name: col_qty + quantity})
        )

        async def _work(conn):
            # Copy any descriptive columns across in case the destination needs a
            # brand new stock record.
            carried: Dict[str, Any] = {}
            for logical_name in ("description",):
                if logical_name in config.columns:
                    col = self._col(tbl, config, logical_name)
                    source = (await conn.execute(select(col).where(col_sku == sku).limit(1))).first()
                    if source is not None:
                        carried[col.name] = source[0]

            deducted = await conn.execute(deduct)
            if deducted.rowcount != 1:
                raise ValueError(
                    f"Cannot transfer {quantity} of '{sku}': location '{from_location_id}' "
                    f"has no stock record for this SKU, or holds fewer than {quantity}."
                )

            added = await conn.execute(add)
            if added.rowcount > 1:
                raise ValueError(
                    f"Cannot transfer '{sku}': location '{to_location_id}' has more than one "
                    "stock record for this SKU, so the destination is ambiguous."
                )

            created_record = added.rowcount == 0
            if created_record:
                # The destination does not stock this SKU yet. Opening a record for it
                # is part of the same transaction, so the units are never in limbo.
                await conn.execute(insert(tbl).values({
                    col_sku.name: sku,
                    col_loc.name: to_location_id,
                    col_qty.name: quantity,
                    **carried,
                }))

            return {
                "status": "success",
                "sku": sku,
                "quantity": quantity,
                "from_location_id": from_location_id,
                "to_location_id": to_location_id,
                "created_destination_record": created_record,
            }

        return await self.db_service.run_in_transaction(tenant_id, connection_string, _work)

    async def create_order(self, tenant_id: str, connection_string: str, manifest: MappingManifest, order_id: str, sku: str, quantity: int, location_id: str) -> Dict[str, Any]:
        """
        Handles inserting new fulfillment records asynchronously.
        """
        config = self._get_table_config(manifest, "orders")

        tbl = self._build_table(config)

        values = {
            config.columns["order_id"].physical_name: order_id,
            config.columns["sku"].physical_name: sku,
            config.columns["quantity"].physical_name: quantity,
        }

        if "location_id" in config.columns:
            values[config.columns["location_id"].physical_name] = location_id

        stmt = insert(tbl).values(**values)

        return await self.db_service.execute_query(tenant_id, connection_string, stmt)
