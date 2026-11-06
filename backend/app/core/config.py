import os
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> backend/
BACKEND_ROOT = Path(__file__).resolve().parents[2]

# The provider env var names LangChain looks for, keyed by our settings field.
_PROVIDER_KEY_VARS = {
    "groq_api_key": "GROQ_API_KEY",
    "openai_api_key": "OPENAI_API_KEY",
    "anthropic_api_key": "ANTHROPIC_API_KEY",
    "google_api_key": "GOOGLE_API_KEY",
}

class Settings(BaseSettings):
    """
    Application configuration, read from backend/.env and the process environment.
    Which model powers the agent is deployment configuration, not something the
    code should hardcode: set LLM_PROVIDER / LLM_MODEL to switch provider.
    """
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    llm_provider: str = "groq"
    llm_model: str = "openai/gpt-oss-120b"

    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None

    def export_provider_keys(self) -> None:
        """
        LangChain's init_chat_model reads provider credentials from the process
        environment, so publish whatever the .env supplied back into os.environ.
        """
        for field, var in _PROVIDER_KEY_VARS.items():
            value = getattr(self, field)
            if value:
                os.environ.setdefault(var, value)

settings = Settings()
settings.export_provider_keys()
