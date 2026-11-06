-- PostgreSQL fixture: the "legacy ERP" naming convention — SCREAMING_SNAKE table
-- names and Hungarian-prefixed columns (C_ for char, N_ for numeric, D_ for date).
-- Every identifier is double-quoted, because unquoted identifiers fold to lower
-- case in PostgreSQL and the point of this fixture is that the real schema is
-- upper case and nothing in the application knows that.

DROP TABLE IF EXISTS "TBL_ORD_HDR";
DROP TABLE IF EXISTS "TBL_STOCK_MST";

CREATE TABLE "TBL_STOCK_MST" (
    "N_ROW_ID"      SERIAL PRIMARY KEY,
    "C_ITEM_CD"     VARCHAR(40)  NOT NULL,
    "C_ITEM_DESC"   VARCHAR(120),
    "N_QTY_ON_HAND" INTEGER      NOT NULL DEFAULT 0,
    "C_WHSE_ID"     VARCHAR(20)  NOT NULL,
    "D_LAST_UPD"    TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE "TBL_ORD_HDR" (
    "N_SEQ"      SERIAL PRIMARY KEY,   -- surrogate key: a repeated order number is legal here
    "C_ORD_NO"   VARCHAR(40) NOT NULL,
    "C_ITEM_CD"  VARCHAR(40) NOT NULL,
    "N_ORD_QTY"  INTEGER     NOT NULL,
    "C_STORE_ID" VARCHAR(20),
    "D_CREATED"  TIMESTAMP   DEFAULT NOW()
);

-- Hex bolts total 8,950 here and a different number in every other fixture, so
-- the answer to one question identifies which database was actually queried.
INSERT INTO "TBL_STOCK_MST" ("C_ITEM_CD", "C_ITEM_DESC", "N_QTY_ON_HAND", "C_WHSE_ID") VALUES
 ('SKU-BOLT-M8',    'Hex Bolt M8 Stainless',    6000, 'WH-LONDON'),
 ('SKU-BOLT-M8',    'Hex Bolt M8 Stainless',     450, 'WH-LEEDS'),
 ('SKU-BOLT-M10',   'Hex Bolt M10 Stainless',   2500, 'WH-LONDON'),
 ('SKU-WIDGET-001', 'Blue Widget 10mm',          420, 'WH-LONDON'),
 ('SKU-WIDGET-001', 'Blue Widget 10mm',           85, 'WH-LEEDS'),
 ('SKU-CAM-4K',     '4K Security Camera Dome',    35, 'WH-LEEDS');

INSERT INTO "TBL_ORD_HDR" ("C_ORD_NO", "C_ITEM_CD", "N_ORD_QTY", "C_STORE_ID") VALUES
 ('ORD-5001', 'SKU-BOLT-M10', 60, 'WH-LEEDS'),
 ('ORD-5002', 'SKU-CAM-4K',    4, 'WH-LONDON');

SELECT 'rows' AS what, COUNT(*) AS n FROM "TBL_STOCK_MST"
UNION ALL
SELECT 'hex total', SUM("N_QTY_ON_HAND") FROM "TBL_STOCK_MST" WHERE "C_ITEM_DESC" LIKE '%Hex Bolt%';
