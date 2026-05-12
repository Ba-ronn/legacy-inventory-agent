from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Agentic Inventory System API",
    description="Intelligent Orchestration of Hybrid Data Ecosystems API",
    version="0.1.0",
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
