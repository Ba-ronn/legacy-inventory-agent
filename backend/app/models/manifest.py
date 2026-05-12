from pydantic import BaseModel, Field
from typing import Dict, Optional, Any

class ColumnMap(BaseModel):
    """Maps a standard logical column name to the physical legacy column name"""
    logical_name: str = Field(..., description="Our internal standard name, e.g., 'sku'")
    physical_name: str = Field(..., description="The user's actual database column name, e.g., 'C_SKU_ID'")
    data_type: str = Field("string", description="The data type in the legacy db")

class TableMap(BaseModel):
    """Maps a standard logical table to a physical legacy table, and holds its column mappings"""
    logical_name: str = Field(..., description="Our internal standard table name, e.g., 'inventory'")
    physical_name: str = Field(..., description="The user's actual database table name, e.g., 'TBL_INV_01'")
    columns: Dict[str, ColumnMap] = Field(
        default_factory=dict, 
        description="Key is logical column name, value is the ColumnMap"
    )

class MappingManifest(BaseModel):
    """
    The Source of Truth for mapping a user's legacy database to our Standard Model.
    This JSON document is injected into the context of the agent tools.
    """
    tenant_id: str = Field(..., description="The user or organization ID")
    db_dialect: str = Field(..., description="The database dialect, e.g., 'postgresql', 'sqlite', 'mssql'")
    
    # The tables dictionary maps our standard logical tables to the user's legacy tables
    tables: Dict[str, TableMap] = Field(
        default_factory=dict,
        description="Standard table names mapped to physical table models"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "tenant_id": "tenant-123",
                "db_dialect": "sqlite",
                "tables": {
                    "inventory": {
                        "logical_name": "inventory",
                        "physical_name": "TBL_STOCK_MST",
                        "columns": {
                            "sku": {
                                "logical_name": "sku",
                                "physical_name": "C_ITEM_CD",
                                "data_type": "string"
                            },
                            "quantity": {
                                "logical_name": "quantity",
                                "physical_name": "N_QTY_ON_HAND",
                                "data_type": "integer"
                            },
                            "location_id": {
                                "logical_name": "location_id",
                                "physical_name": "C_WHSE_ID",
                                "data_type": "string"
                            }
                        }
                    },
                    "orders": {
                        "logical_name": "orders",
                        "physical_name": "TBL_ORD_HDR",
                        "columns": {
                            "order_id": {
                                "logical_name": "order_id",
                                "physical_name": "C_ORD_NO",
                                "data_type": "string"
                            },
                            "sku": {
                                "logical_name": "sku",
                                "physical_name": "C_ITEM_CD",
                                "data_type": "string"
                            },
                            "quantity": {
                                "logical_name": "quantity",
                                "physical_name": "N_ORD_QTY",
                                "data_type": "integer"
                            },
                            "location_id": {
                                "logical_name": "location_id",
                                "physical_name": "C_STORE_ID",
                                "data_type": "string"
                            }
                        }
                    }
                }
            }
        }
