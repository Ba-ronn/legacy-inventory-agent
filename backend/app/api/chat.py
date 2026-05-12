import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..agent.core import InventoryAgent
from ..models.manifest import MappingManifest

router = APIRouter()

class ChatRequest(BaseModel):
    tenant_id: str
    connection_string: str
    query: str

class ChatResponse(BaseModel):
    response: str

# Instantiate the agent globally or use dependency injection
# Using gpt-4o as the reasoning engine for the agent
agent = InventoryAgent(provider="openai", model_name="gpt-4o")

@router.post("/query", response_model=ChatResponse)
async def process_chat_query(request: ChatRequest):
    """
    Receives a natural language query from the user, retrieves their mapped manifest,
    and delegates to the LangGraph Inventory Agent.
    """
    file_path = f"manifest_{request.tenant_id}.json"
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=400, 
            detail=f"No mapping manifest found for tenant {request.tenant_id}. Please complete the onboarding flow first."
        )
        
    try:
        # Load the manifest from our simulated application DB
        with open(file_path, 'r') as f:
            manifest_data = json.load(f)
            manifest = MappingManifest(**manifest_data)
            
        # Execute the agent graph
        response_text = await agent.process_query(
            user_query=request.query,
            tenant_id=request.tenant_id,
            connection_string=request.connection_string,
            manifest=manifest
        )
        
        return ChatResponse(response=response_text)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent orchestration failed: {str(e)}")
