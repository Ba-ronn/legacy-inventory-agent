from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy import create_engine, inspect
import json
import os
from ..services.langchain_service import LangChainService

from ..models.manifest import MappingManifest

router = APIRouter()

class ConnectionRequest(BaseModel):
    connection_string: str

class SchemaColumn(BaseModel):
    name: str
    type: str

class SchemaTable(BaseModel):
    table_name: str
    columns: List[SchemaColumn]

class InspectResponse(BaseModel):
    tables: List[SchemaTable]

class SuggestionRequest(BaseModel):
    tenant_id: str
    db_dialect: str
    legacy_schema: List[SchemaTable]

@router.post("/inspect", response_model=InspectResponse)
async def inspect_database(request: ConnectionRequest):
    """
    Connects to the user's legacy database and pulls the schema using SQLAlchemy Reflection.
    """
    try:
        # In a real app, you would securely handle credentials.
        engine = create_engine(request.connection_string)
        inspector = inspect(engine)
        
        tables = []
        for table_name in inspector.get_table_names():
            columns = []
            for col in inspector.get_columns(table_name):
                columns.append(SchemaColumn(name=col['name'], type=str(col['type'])))
            tables.append(SchemaTable(table_name=table_name, columns=columns))
            
        return InspectResponse(tables=tables)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to inspect database: {str(e)}")

@router.post("/suggest-mapping", response_model=MappingManifest)
async def suggest_mapping(request: SuggestionRequest):
    """
    Uses an LLM to compare the legacy schema against our Standard Model 
    and generates a suggested Mapping Manifest.
    """
    try:
        # Instantiate the service. In a real app, use FastAPI dependency injection (Depends)
        # to fetch this so we can dynamically pass the provider/model from user settings.
        langchain_service = LangChainService()
        
        result = langchain_service.suggest_schema_mapping(
            tenant_id=request.tenant_id,
            db_dialect=request.db_dialect,
            legacy_schema=request.legacy_schema
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to suggest mapping: {str(e)}")

@router.post("/save-manifest")
async def save_manifest(manifest: MappingManifest):
    """
    Persists the user-approved mapping manifest to the application DB.
    (For Phase 2, we simulate this by saving to a local JSON file)
    """
    file_path = f"manifest_{manifest.tenant_id}.json"
    try:
        with open(file_path, 'w') as f:
            f.write(manifest.model_dump_json(indent=2))
        return {"status": "success", "message": f"Manifest saved successfully for tenant {manifest.tenant_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save manifest: {str(e)}")
