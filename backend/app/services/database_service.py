from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from typing import Awaitable, Callable, Dict, Tuple

class DatabaseService:
    """
    Service class responsible for managing database connections to legacy user databases.
    This ensures connection pools are reused and handled scalably using asynchronous I/O.
    """
    def __init__(self):
        # Cache engines by (tenant_id, connection_string). Keying on the tenant alone
        # would pin a tenant to whichever database it happened to connect to first.
        self._engines: Dict[Tuple[str, str], AsyncEngine] = {}

    def get_engine(self, tenant_id: str, connection_string: str) -> AsyncEngine:
        """
        Retrieves or creates an Async SQLAlchemy engine for a specific tenant.
        Note: The connection string must use an async driver (e.g., sqlite+aiosqlite:// or postgresql+asyncpg://)
        """
        key = (tenant_id, connection_string)
        if key not in self._engines:
            # We use pool_pre_ping to check connection validity
            self._engines[key] = create_async_engine(connection_string, pool_pre_ping=True)
        return self._engines[key]

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

    async def dispose_all(self) -> None:
        """
        Closes every pooled connection this service has opened.

        Engines are cached for the life of the process, so without this the pools
        are still holding sockets when the event loop goes away: aiomysql in
        particular then raises "Event loop is closed" out of a destructor, which is
        noise that can mask a real error during shutdown.
        """
        engines, self._engines = self._engines, {}
        for engine in engines.values():
            await engine.dispose()

    async def run_in_transaction(self, tenant_id: str, connection_string: str, work: Callable[..., Awaitable]):
        """
        Runs a unit of work made up of several statements inside ONE transaction.
        Anything raised by `work` rolls the whole unit back, which is what multi-step
        operations such as a stock transfer need.
        """
        engine = self.get_engine(tenant_id, connection_string)
        async with engine.connect() as conn:
            async with conn.begin():
                return await work(conn)
