import json
from typing import Optional, Dict, Any
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

from ...services.inventory_service import InventoryService
from ...services.database_service import DatabaseService
from ...models.manifest import MappingManifest

db_service = DatabaseService()
inventory_service = InventoryService(db_service)

def _get_context(config: RunnableConfig) -> tuple[str, str, MappingManifest]:
    """Helper to extract context injected into the LangChain RunnableConfig"""
    metadata = config.get("configurable", {})
    tenant_id = metadata.get("tenant_id")
    connection_string = metadata.get("connection_string")
    manifest_dict = metadata.get("manifest")
    
    if not all([tenant_id, connection_string, manifest_dict]):
        raise ValueError("Missing required injected context (tenant_id, connection_string, manifest)")
        
    manifest = MappingManifest(**manifest_dict)
    return tenant_id, connection_string, manifest

@tool
async def fuzzy_search_product(search_term: str, config: RunnableConfig) -> str:
    """
    Use this tool to find the exact product SKU when the user provides a messy or partial product name.
    Always run this first if the user does not provide an exact SKU ID.
    """
    tenant_id, connection_string, manifest = _get_context(config)
    results = await inventory_service.fuzzy_search_product(tenant_id, connection_string, manifest, search_term)
    return json.dumps(results)

@tool
async def get_inventory_stock(sku: str, location_id: Optional[str], config: RunnableConfig) -> str:
    """
    Checks the current stock level for a specific exact SKU. 
    Optionally filters by location_id (e.g., specific warehouse or store).
    """
    tenant_id, connection_string, manifest = _get_context(config)
    results = await inventory_service.get_inventory_stock(tenant_id, connection_string, manifest, sku, location_id)
    return json.dumps(results)

@tool
async def update_inventory_stock(sku: str, quantity_change: int, location_id: Optional[str], config: RunnableConfig) -> str:
    """
    Adjusts stock levels for an exact SKU by a specific quantity change (positive to add, negative to subtract).
    Optionally specifies a location_id.
    """
    tenant_id, connection_string, manifest = _get_context(config)
    results = await inventory_service.update_inventory_stock(tenant_id, connection_string, manifest, sku, quantity_change, location_id)
    return json.dumps(results)

@tool
async def transfer_inventory_stock(sku: str, quantity: int, from_location_id: str, to_location_id: str, config: RunnableConfig) -> str:
    """
    Moves an exact quantity of a specific SKU from one location (warehouse/store) to another.
    """
    tenant_id, connection_string, manifest = _get_context(config)
    results = await inventory_service.transfer_inventory_stock(tenant_id, connection_string, manifest, sku, quantity, from_location_id, to_location_id)
    return json.dumps(results)

@tool
async def create_order(order_id: str, sku: str, quantity: int, location_id: str, config: RunnableConfig) -> str:
    """
    Creates a new fulfillment record/order for a specific SKU and quantity at a given location.
    """
    tenant_id, connection_string, manifest = _get_context(config)
    results = await inventory_service.create_order(tenant_id, connection_string, manifest, order_id, sku, quantity, location_id)
    return json.dumps(results)
