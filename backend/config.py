"""
ContextVault Centralized Configuration Module
Loads settings from environment variables and .env file with validated types.
"""

import os
from pathlib import Path
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

# Backend root directory: c:\Users\LoQ\OneDrive\Documents\ContextVault\backend
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server settings
    BACKEND_HOST: str = Field(default="127.0.0.1", description="Host interface to bind backend server")
    BACKEND_PORT: int = Field(default=8000, description="Port number to bind backend server")

    # Upload restrictions (enforces real hard caps on memory and storage)
    MAX_UPLOAD_SIZE_MB: int = Field(default=10, description="Maximum allowed file upload size in megabytes")

    # Directory locations (configurable via environment, resolved to absolute paths)
    DATA_DIR: Path = BACKEND_DIR / "data"
    CHROMA_PERSIST_DIR: str = str(BACKEND_DIR / "data" / "chroma_db")
    UPLOAD_DIR: str = str(BACKEND_DIR / "data" / "uploads")

    # Model settings
    EMBEDDING_MODEL: str = Field(default="all-MiniLM-L6-v2", description="Sentence-Transformers embedding model")

    # LLM Provider configuration: auto | openai | ollama | extractive
    LLM_PROVIDER: str = Field(default="auto", description="LLM provider: auto | openai | ollama | extractive")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API Key (optional)")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", description="OpenAI chat completion model")
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", description="Local Ollama instance URL")
    OLLAMA_MODEL: str = Field(default="llama3", description="Ollama model tag")
    LLM_TIMEOUT_SECONDS: int = Field(default=15, description="Timeout for external LLM API calls in seconds")

    # Cross-Origin Resource Sharing (CORS) allowlist
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def resolved_chroma_dir(self) -> Path:
        p = Path(self.CHROMA_PERSIST_DIR)
        return p if p.is_absolute() else (BACKEND_DIR / p).resolve()

    @property
    def resolved_upload_dir(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        return p if p.is_absolute() else (BACKEND_DIR / p).resolve()


settings = Settings()

# Ensure runtime directories exist
settings.resolved_upload_dir.mkdir(parents=True, exist_ok=True)
settings.resolved_chroma_dir.mkdir(parents=True, exist_ok=True)
