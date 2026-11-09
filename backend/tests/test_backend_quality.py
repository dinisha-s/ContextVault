"""
Step 2 Verification Tests: Backend Quality
Tests covering:
- Streamed file size limit enforcement (HTTP 413)
- Public config API endpoint (/config and /api/config)
- Config settings and environment overrides
- Dedicated LLM providers module (auto, openai, ollama, extractive, timeouts, and zero secret leakage)
"""

import io
import pytest
from fastapi import HTTPException
from config import Settings, settings
import main
import llm_providers


def test_public_config_endpoint(client):
    """
    GET /api/config and /config return running configuration so frontend
    does not hardcode model names or limits.
    """
    for endpoint in ["/config", "/api/config"]:
        response = client.get(endpoint)
        assert response.status_code == 200
        data = response.json()
        assert "embedding_model" in data
        assert "llm_provider" in data
        assert "max_upload_size_mb" in data
        assert "max_upload_size_bytes" in data
        assert "supported_formats" in data
        assert data["max_upload_size_bytes"] == data["max_upload_size_mb"] * 1024 * 1024
        assert ".pdf" in data["supported_formats"]


def test_upload_size_limit_exceeded_returns_413(client, temp_test_env, monkeypatch):
    """
    Uploading a file that exceeds MAX_UPLOAD_SIZE_MB must immediately terminate,
    return HTTP 413 Payload Too Large, and leave no orphan files on disk.
    """
    # Temporarily set upload limit to 1 MB for testing
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 1)

    # Create 1.2 MB of text payload (> 1 MB limit)
    oversized_data = b"A" * (1024 * 1024 + 200 * 1024)

    response = client.post(
        "/upload",
        files={"file": ("large_file.txt", io.BytesIO(oversized_data), "text/plain")}
    )

    assert response.status_code == 413, (
        f"Expected 413 Payload Too Large, got {response.status_code}: {response.text}"
    )
    assert "maximum allowed upload size" in response.json()["detail"]

    # Verify no file was left behind in the uploads folder
    uploads_dir = temp_test_env["uploads"]
    assert len(list(uploads_dir.iterdir())) == 0, "Oversized upload left an orphan file on disk!"


def test_upload_within_size_limit_succeeds(client, temp_test_env):
    """
    Uploading a valid file within the allowed size limit succeeds with HTTP 200.
    """
    content = b"# ContextVault Title\nThis is valid markdown content within size limit."
    response = client.post(
        "/upload",
        files={"file": ("valid_doc.md", io.BytesIO(content), "text/markdown")}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "Indexed successfully"


def test_settings_cors_origins_parsing():
    """
    Settings correctly parses CORS_ORIGINS from comma-separated string or list.
    """
    s1 = Settings(CORS_ORIGINS="http://example.com, http://app.local")
    assert s1.CORS_ORIGINS == ["http://example.com", "http://app.local"]

    s2 = Settings(CORS_ORIGINS='["http://site1.com", "http://site2.com"]')
    assert s2.CORS_ORIGINS == ["http://site1.com", "http://site2.com"]


def test_llm_provider_extractive_synthesizer():
    """
    Extractive engine formats citations into structured blockquotes without requiring an LLM.
    """
    citations = [
        {
            "source": "manual.pdf",
            "page": 2,
            "content": "Step 1: Connect Raspberry Pi to 5V power supply.\nStep 2: Boot Raspberry Pi OS."
        }
    ]
    answer, provider = llm_providers.synthesize_extractive_answer(citations)
    assert "manual.pdf (Page 2)" in answer
    assert "Connect Raspberry Pi" in answer
    assert provider == "ContextVault Grounded Fallback"

    # Empty citations fallback
    empty_answer, empty_provider = llm_providers.synthesize_extractive_answer([])
    assert "No relevant context found" in empty_answer
    assert empty_provider == "ContextVault Extractive Engine"


def test_llm_provider_explicit_openai_without_key_raises_502(monkeypatch):
    """
    When LLM_PROVIDER is explicitly set to 'openai' but the key is missing or invalid,
    it must raise an HTTP 502 Bad Gateway error.
    """
    monkeypatch.setattr(settings, "LLM_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")

    with pytest.raises(HTTPException) as exc_info:
        llm_providers.generate_llm_answer("test query", "test context", [])

    assert exc_info.value.status_code == 502
    assert "OpenAI Generation Error" in exc_info.value.detail


def test_llm_provider_explicit_ollama_unreachable_raises_502(monkeypatch):
    """
    When LLM_PROVIDER is explicitly set to 'ollama' but the host is unreachable,
    it must raise an HTTP 502 Bad Gateway error with the target URL.
    """
    monkeypatch.setattr(settings, "LLM_PROVIDER", "ollama")
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://127.0.0.1:54321")
    monkeypatch.setattr(settings, "LLM_TIMEOUT_SECONDS", 1)

    with pytest.raises(HTTPException) as exc_info:
        llm_providers.generate_llm_answer("test query", "test context", [])

    assert exc_info.value.status_code == 502
    assert "Could not connect to Ollama" in exc_info.value.detail


def test_llm_provider_auto_mode_graceful_degradation(monkeypatch):
    """
    In 'auto' mode, if OpenAI and Ollama fail, it must seamlessly fall back
    to the extractive synthesizer rather than raising 502 or crashing.
    """
    monkeypatch.setattr(settings, "LLM_PROVIDER", "auto")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "dummy_invalid_key")
    monkeypatch.setattr(settings, "OLLAMA_BASE_URL", "http://127.0.0.1:54321")
    monkeypatch.setattr(settings, "LLM_TIMEOUT_SECONDS", 1)

    citations = [{"source": "guide.txt", "page": 1, "content": "Sample content"}]
    answer, provider = llm_providers.generate_llm_answer("test query", "test context", citations)

    assert provider == "ContextVault Grounded Fallback"
    assert "guide.txt" in answer


def test_llm_zero_secret_leakage_in_error_messages(monkeypatch):
    """
    Validates that raw secret API keys are never leaked into error messages.
    """
    secret = "sk-super-secret-production-key-12345"
    monkeypatch.setattr(settings, "LLM_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", secret)

    # Force a mock error containing the secret key
    def mock_call_openai(query, prompt):
        raise RuntimeError(f"Failed to authenticate with key {secret}")

    monkeypatch.setattr(llm_providers, "call_openai_provider", mock_call_openai)

    with pytest.raises(HTTPException) as exc_info:
        llm_providers.generate_llm_answer("query", "context", [])

    assert secret not in exc_info.value.detail, "Security breach: secret API key was leaked in error response!"
    assert "[REDACTED_API_KEY]" in exc_info.value.detail
