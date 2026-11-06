from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url
from ..services.langchain_service import LangChainService
from ..services import manifest_store

from ..models.manifest import MappingManifest

router = APIRouter()

# Reflection runs on a synchronous driver, but every other part of the system
# (and therefore the connection string the user gives us) uses an async one.
# Map the async drivers onto their sync equivalents so a single connection
# string works for both onboarding and the agent.
_SYNC_DRIVERS = {
    "asyncpg": "psycopg2",
    "aiosqlite": None,
    "aiomysql": "pymysql",
    "asyncmy": "pymysql",
    "aioodbc": "pyodbc",
}

def to_sync_url(connection_string: str) -> str:
    """Returns the same database URL expressed with a synchronous driver."""
    url = make_url(connection_string)
    if url.drivername and "+" in url.drivername:
        backend, driver = url.drivername.split("+", 1)
        if driver in _SYNC_DRIVERS:
            sync_driver = _SYNC_DRIVERS[driver]
            url = url.set(drivername=f"{backend}+{sync_driver}" if sync_driver else backend)
    return url.render_as_string(hide_password=False)


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

class SaveManifestRequest(BaseModel):
    manifest: MappingManifest
    # Optional so a manifest saved without one still lands in the pre-existing
    # tenant-wide slot rather than being rejected.
    connection_string: Optional[str] = None

class ManifestStatusRequest(BaseModel):
    tenant_id: str
    connection_string: str

class ManifestStatusResponse(BaseModel):
    exists: bool
    db_dialect: Optional[str] = None
    table_count: int = 0
    column_count: int = 0

@router.post("/inspect", response_model=InspectResponse)
async def inspect_database(request: ConnectionRequest):
    """
    Connects to the user's legacy database and pulls the schema using SQLAlchemy Reflection.
    """
    try:
        # In a real app, you would securely handle credentials.
        engine = create_engine(to_sync_url(request.connection_string))
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
        
        result = await langchain_service.suggest_schema_mapping(
            tenant_id=request.tenant_id,
            db_dialect=request.db_dialect,
            legacy_schema=request.legacy_schema
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to suggest mapping: {str(e)}")

@router.post("/save-manifest")
async def save_manifest(request: SaveManifestRequest):
    """
    Persists the user-approved mapping manifest to the application DB.
    (For Phase 2, we simulate this by saving to a local JSON file)

    The connection string scopes the manifest to the database it was built from,
    so a tenant can keep several connections without their mappings colliding.
    """
    manifest = request.manifest
    try:
        manifest_store.save(manifest.tenant_id, request.connection_string, manifest)
        return {"status": "success", "message": f"Manifest saved successfully for tenant {manifest.tenant_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save manifest: {str(e)}")


@router.post("/manifest-status", response_model=ManifestStatusResponse)
async def manifest_status(request: ManifestStatusRequest):
    """
    Reports whether an approved mapping already exists for this connection, so
    the UI can offer a saved database as a one-click resume instead of making
    the user walk through onboarding again.

    The connection string travels in the body rather than the query string so it
    stays out of URLs and request logs.
    """
    manifest = manifest_store.load(request.tenant_id, request.connection_string)
    if manifest is None:
        return ManifestStatusResponse(exists=False)
    return ManifestStatusResponse(
        exists=True,
        db_dialect=manifest.db_dialect,
        table_count=len(manifest.tables),
        column_count=sum(len(t.columns) for t in manifest.tables.values()),
    )
