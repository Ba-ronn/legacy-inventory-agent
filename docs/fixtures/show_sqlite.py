"""Prints the SQLite fixture's two tables, for showing the database on camera.

SQLite has no server to shell into, so this stands in for `psql` / `sqlcmd`.
Run it from the repository root:  python docs/fixtures/show_sqlite.py
"""
import sqlite3
import sys
from pathlib import Path

DB = Path(sys.argv[1] if len(sys.argv) > 1 else "backend/dublin_ops.db")

QUERIES = [
    ("stock_ledger",
     "SELECT part_number, part_label, on_hand_qty, site_code"
     " FROM stock_ledger ORDER BY part_number, site_code"),
    ("purchase_orders",
     "SELECT po_number, part_number, order_qty, ship_to"
     " FROM purchase_orders ORDER BY po_number"),
    ("hex bolt total",
     "SELECT SUM(on_hand_qty) FROM stock_ledger WHERE part_label LIKE '%Hex Bolt%'"),
]

if not DB.exists():
    sys.exit(f"no such database: {DB.resolve()}")

con = sqlite3.connect(DB)
print(f"{DB.resolve()}\n")
for title, sql in QUERIES:
    rows = con.execute(sql).fetchall()
    print(title)
    print("-" * len(title))
    widths = [max(len(str(r[i])) for r in rows) if rows else 0 for i in range(len(rows[0]))] if rows else []
    for row in rows:
        print("  " + "  ".join(str(v).ljust(widths[i]) for i, v in enumerate(row)))
    print()
