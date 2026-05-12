from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from typing import Dict

class DatabaseService:
    """
    Service class responsible for managing database connections to legacy user databases.
    This ensures connection pools are reused and handled scalably using asynchronous I/O.
    """
    def __init__(self):
        # Cache engines by tenant_id to avoid recreating them
        self._engines: Dict[str, AsyncEngine] = {}

    def get_engine(self, tenant_id: str, connection_string: str) -> AsyncEngine:
        """
        Retrieves or creates an Async SQLAlchemy engine for a specific tenant.
        Note: The connection string must use an async driver (e.g., sqlite+aiosqlite:// or postgresql+asyncpg://)
        """
        if tenant_id not in self._engines:
            # We use pool_pre_ping to check connection validity
            self._engines[tenant_id] = create_async_engine(connection_string, pool_pre_ping=True)
        return self._engines[tenant_id]

    async def execute_query(self, tenant_id: str, connection_string: str, query):
        """
        Asynchronously executes an SQLAlchemy Core expression query and returns the results.
        """
        engine = self.get_engine(tenant_id, connection_string)
        async with engine.connect() as conn:
            # Use a transaction for safety
            async with conn.begin():
                result = await conn.execute(query)
                # If it's a fetch query, it returns rows. If it's an update/insert, it returns rowcount.
                if result.returns_rows:
                    return [dict(row._mapping) for row in result]
                return {"rowcount": result.rowcount}
