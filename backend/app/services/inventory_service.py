from sqlalchemy import table, column, select, update, insert, String
from sqlalchemy.sql.expression import cast
from typing import Optional, Dict, Any, List

from .database_service import DatabaseService
from ..models.manifest import MappingManifest

class InventoryService:
    """
    Brand-agnostic service for executing inventory operations against legacy databases.
    Uses SQLAlchemy Core to generate dialect-independent SQL queries based on a mapping manifest.
    """
    def __init__(self, db_service: DatabaseService):
        self.db_service = db_service

    def _get_table_config(self, manifest: MappingManifest, logical_table: str):
        if logical_table not in manifest.tables:
            raise ValueError(f"Table '{logical_table}' not found in mapping manifest.")
        return manifest.tables[logical_table]

    async def fuzzy_search_product(self, tenant_id: str, connection_string: str, manifest: MappingManifest, search_term: str) -> List[Dict[str, Any]]:
        """
        Uses SQL LIKE to find SKUs matching the search term asynchronously.
        """
        config = self._get_table_config(manifest, "inventory")
        
        tbl = table(config.physical_name)
        col_sku = column(config.columns["sku"].physical_name)
        
        # Cast to string for generic LIKE
        stmt = select(col_sku).where(cast(col_sku, String).ilike(f"%{search_term}%")).limit(10)
        
        return await self.db_service.execute_query(tenant_id, connection_string, stmt)

    async def get_inventory_stock(self, tenant_id: str, connection_string: str, manifest: MappingManifest, sku: str, location_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Resolves physical names from manifest and safely queries stock asynchronously.
        """
        config = self._get_table_config(manifest, "inventory")
        
        tbl = table(config.physical_name)
        col_sku = column(config.columns["sku"].physical_name)
        col_qty = column(config.columns["quantity"].physical_name)
        
        stmt = select(col_qty)
        conditions = [col_sku == sku]
        
        if location_id and "location_id" in config.columns:
            col_loc = column(config.columns["location_id"].physical_name)
            conditions.append(col_loc == location_id)
            stmt = select(col_qty, col_loc)
            
        stmt = stmt.where(*conditions)
        
        return await self.db_service.execute_query(tenant_id, connection_string, stmt)

    async def update_inventory_stock(self, tenant_id: str, connection_string: str, manifest: MappingManifest, sku: str, quantity_change: int, location_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Adjusts stock levels securely based on the mapping asynchronously.
        """
        config = self._get_table_config(manifest, "inventory")
        
        tbl = table(config.physical_name)
        col_sku = column(config.columns["sku"].physical_name)
        col_qty = column(config.columns["quantity"].physical_name)
        
        conditions = [col_sku == sku]
        
        if location_id and "location_id" in config.columns:
            col_loc = column(config.columns["location_id"].physical_name)
            conditions.append(col_loc == location_id)
            
        stmt = update(tbl).where(*conditions).values({
            col_qty.name: col_qty + quantity_change
        })
        
        return await self.db_service.execute_query(tenant_id, connection_string, stmt)

    async def transfer_inventory_stock(self, tenant_id: str, connection_string: str, manifest: MappingManifest, sku: str, quantity: int, from_location_id: str, to_location_id: str) -> Dict[str, Any]:
        """
        Moves stock safely between two distinct locations asynchronously.
        Note: A real implementation would wrap these in a single strict async transaction via the db_service.
        """
        res1 = await self.update_inventory_stock(tenant_id, connection_string, manifest, sku, -quantity, from_location_id)
        if res1.get("rowcount", 0) == 0:
            raise ValueError(f"Failed to deduct stock from source location {from_location_id}.")
            
        res2 = await self.update_inventory_stock(tenant_id, connection_string, manifest, sku, quantity, to_location_id)
        return {"status": "success", "deducted": res1, "added": res2}

    async def create_order(self, tenant_id: str, connection_string: str, manifest: MappingManifest, order_id: str, sku: str, quantity: int, location_id: str) -> Dict[str, Any]:
        """
        Handles inserting new fulfillment records asynchronously.
        """
        config = self._get_table_config(manifest, "orders")
        
        tbl = table(config.physical_name)
        
        values = {
            config.columns["order_id"].physical_name: order_id,
            config.columns["sku"].physical_name: sku,
            config.columns["quantity"].physical_name: quantity,
        }
        
        if "location_id" in config.columns:
            values[config.columns["location_id"].physical_name] = location_id
            
        stmt = insert(tbl).values(**values)
        
        return await self.db_service.execute_query(tenant_id, connection_string, stmt)
