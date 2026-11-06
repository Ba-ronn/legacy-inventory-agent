from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agent.tools.inventory import db_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    # Connection pools to the customer databases are cached for the life of the
    # process, so closing them is our job rather than the garbage collector's.
    await db_service.dispose_all()


app = FastAPI(
    title="Agentic Inventory System API",
    description="Intelligent Orchestration of Hybrid Data Ecosystems API",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS for the frontend (React/Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, this should be restricted
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from app.api import onboarding, chat

# Route inclusions
app.include_router(onboarding.router, prefix="/api/v1/onboarding", tags=["onboarding"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
