DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS stock_ledger;

-- Deliberately a different naming convention from the PostgreSQL fixture:
-- snake_case, different words, no type-prefixed columns. Nothing but the
-- mapping manifest should have to change.
CREATE TABLE stock_ledger (
    row_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number  TEXT NOT NULL,
    part_label   TEXT,
    on_hand_qty  INTEGER NOT NULL DEFAULT 0,
    site_code    TEXT NOT NULL
);

CREATE TABLE purchase_orders (
    seq         INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number   TEXT NOT NULL,
    part_number TEXT NOT NULL,
    order_qty   INTEGER NOT NULL,
    ship_to     TEXT
);

-- Quantities differ from every other fixture, so an answer proves which
-- database actually got queried.
INSERT INTO stock_ledger (part_number, part_label, on_hand_qty, site_code) VALUES
 ('SKU-BOLT-M8','Hex Bolt M8 Stainless',    1200,'SITE-DUBLIN'),
 ('SKU-BOLT-M8','Hex Bolt M8 Stainless',     300,'SITE-CORK'),
 ('SKU-BOLT-M10','Hex Bolt M10 Stainless',   750,'SITE-DUBLIN'),
 ('SKU-WIDGET-001','Blue Widget 10mm',       500,'SITE-DUBLIN'),
 ('SKU-WIDGET-001','Blue Widget 10mm',        60,'SITE-CORK'),
 ('SKU-CAM-4K','4K Security Camera Dome',     22,'SITE-DUBLIN');

INSERT INTO purchase_orders (po_number, part_number, order_qty, ship_to) VALUES
 ('PO-7001','SKU-BOLT-M8',   40,'SITE-CORK'),
 ('PO-7002','SKU-CAM-4K',     3,'SITE-DUBLIN');
