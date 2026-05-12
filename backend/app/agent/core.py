from langgraph.prebuilt import create_react_agent
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, SystemMessage

from ..services.langchain_service import LangChainService
from .tools.inventory import (
    fuzzy_search_product,
    get_inventory_stock,
    update_inventory_stock,
    transfer_inventory_stock,
    create_order
)
from ..models.manifest import MappingManifest

class InventoryAgent:
    """
    The orchestrator that bridges natural language queries to the tool layer.
    """
    def __init__(self, provider: str = "openai", model_name: str = "gpt-4o"):
        # We reuse the dynamic LLM factory from our scalable LangChainService
        self.langchain_service = LangChainService(provider=provider, model_name=model_name)
        
        self.tools = [
            fuzzy_search_product,
            get_inventory_stock,
            update_inventory_stock,
            transfer_inventory_stock,
            create_order
        ]
        
        # We use LangGraph's prebuilt React agent for tool calling and reasoning
        self.agent_executor = create_react_agent(self.langchain_service.llm, self.tools)
        
        self.system_prompt = """
        You are a highly capable Agentic Inventory System for inventory management.
        You have tools to check stock, update stock, transfer stock, and create orders.
        ALWAYS use the fuzzy_search_product tool first if the user provides a natural language product name instead of a specific exact SKU.
        Only perform database operations using the provided tools. Do not guess information.
        """

    async def process_query(self, user_query: str, tenant_id: str, connection_string: str, manifest: MappingManifest) -> str:
        """
        Executes the agent loop asynchronously. It safely injects the DB credentials and Mapping Manifest
        via LangGraph's configuration object so the LLM itself never sees the raw manifest.
        """
        # Inject the context securely into the tool RunnableConfig
        config = {
            "configurable": {
                "tenant_id": tenant_id,
                "connection_string": connection_string,
                "manifest": manifest.model_dump()
            }
        }
        
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=user_query)
        ]
        
        # Invoke the LangGraph executor asynchronously
        response = await self.agent_executor.ainvoke({"messages": messages}, config=config)
        
        # Return the final message content from the agent
        return response["messages"][-1].content
