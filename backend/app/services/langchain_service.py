import json
from typing import List
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from ..models.manifest import MappingManifest

# Assume SchemaTable is defined in the models or imported appropriately
# For this service, we just expect a list of Pydantic models or dicts that we can dump
class LangChainService:
    def __init__(self, provider: str = "openai", model_name: str = "gpt-4o"):
        """
        Initializes the dynamic chat model based on provider configuration, 
        supporting the BYOK multi-provider architecture.
        """
        # init_chat_model automatically handles routing to ChatOpenAI, ChatAnthropic, etc.
        self.llm = init_chat_model(model=model_name, model_provider=provider, temperature=0)

    async def suggest_schema_mapping(self, tenant_id: str, db_dialect: str, legacy_schema: List[any]) -> MappingManifest:
        """
        Uses an LLM asynchronously to compare the legacy schema against our Standard Model 
        and generates a suggested Mapping Manifest.
        """
        parser = PydanticOutputParser(pydantic_object=MappingManifest)
        
        system_prompt = """
        You are an expert database architect. Your job is to map a legacy database schema to our Standard Inventory Model.
        Our Standard Model expects these tables:
        1. 'inventory' (columns: sku, quantity, location_id)
        2. 'orders' (columns: order_id, sku, quantity, location_id)
        
        You will be provided with the user's legacy database schema.
        Map the legacy tables and columns to our Standard Model to the best of your ability.
        Return the mapping exactly in the requested JSON format.
        
        Tenant ID: {tenant_id}
        DB Dialect: {db_dialect}
        """
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "Legacy Schema:\n{schema}\n\n{format_instructions}")
        ])
        
        chain = prompt | self.llm | parser
        
        # Assume legacy_schema is a list of Pydantic models or dicts
        schema_str = json.dumps([t.model_dump() if hasattr(t, 'model_dump') else t for t in legacy_schema], indent=2)
        
        result = await chain.ainvoke({
            "tenant_id": tenant_id,
            "db_dialect": db_dialect,
            "schema": schema_str,
            "format_instructions": parser.get_format_instructions()
        })
        
        return result
