from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..agent.core import InventoryAgent
from ..services import manifest_store

router = APIRouter()

class ChatRequest(BaseModel):
    tenant_id: str
    connection_string: str
    query: str

class ChatResponse(BaseModel):
    response: str

# The agent is built on first use rather than at import time: constructing it
# here would make the whole application fail to import when the configured
# provider has no credentials.
_agent: Optional[InventoryAgent] = None

def get_agent() -> InventoryAgent:
    global _agent
    if _agent is None:
        _agent = InventoryAgent()
    return _agent

@router.post("/query", response_model=ChatResponse)
async def process_chat_query(request: ChatRequest):
    """
    Receives a natural language query from the user, retrieves their mapped manifest,
    and delegates to the LangGraph Inventory Agent.
    """
    # Scoped to the connection, so the agent resolves columns against the schema
    # that was actually mapped rather than whichever one was onboarded last.
    manifest = manifest_store.load(request.tenant_id, request.connection_string)

    if manifest is None:
        raise HTTPException(
            status_code=400,
            detail=f"No mapping manifest found for tenant {request.tenant_id}. Please complete the onboarding flow first."
        )

    try:
        # Execute the agent graph
        response_text = await get_agent().process_query(
            user_query=request.query,
            tenant_id=request.tenant_id,
            connection_string=request.connection_string,
            manifest=manifest
        )
        
        return ChatResponse(response=response_text)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent orchestration failed: {str(e)}")
