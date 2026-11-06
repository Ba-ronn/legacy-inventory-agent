DROP TABLE IF EXISTS ord_lines;
DROP TABLE IF EXISTS inv_master;

-- A third naming convention again: abbreviated prefixes, nothing in common with
-- the PostgreSQL or SQLite fixtures beyond the meaning of the data.
CREATE TABLE inv_master (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    itm_sku   VARCHAR(40)  NOT NULL,
    itm_name  VARCHAR(120),
    qty_avail INT          NOT NULL DEFAULT 0,
    loc_cd    VARCHAR(20)  NOT NULL
);

CREATE TABLE ord_lines (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    ord_ref  VARCHAR(40) NOT NULL,
    itm_sku  VARCHAR(40) NOT NULL,
    qty_req  INT         NOT NULL,
    dest_cd  VARCHAR(20)
);

INSERT INTO inv_master (itm_sku, itm_name, qty_avail, loc_cd) VALUES
 ('SKU-BOLT-M8','Hex Bolt M8 Stainless',   2500,'LOC-BERLIN'),
 ('SKU-BOLT-M8','Hex Bolt M8 Stainless',    400,'LOC-MUNICH'),
 ('SKU-BOLT-M10','Hex Bolt M10 Stainless', 1500,'LOC-BERLIN'),
 ('SKU-WIDGET-001','Blue Widget 10mm',      900,'LOC-BERLIN'),
 ('SKU-WIDGET-001','Blue Widget 10mm',      120,'LOC-MUNICH'),
 ('SKU-CAM-4K','4K Security Camera Dome',    48,'LOC-MUNICH');

INSERT INTO ord_lines (ord_ref, itm_sku, qty_req, dest_cd) VALUES
 ('ORD-3001','SKU-BOLT-M10', 60,'LOC-MUNICH'),
 ('ORD-3002','SKU-CAM-4K',    4,'LOC-BERLIN');
