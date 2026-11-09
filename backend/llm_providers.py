"""
ContextVault LLM Providers Module
Encapsulates external LLM interactions (OpenAI, Ollama) and offline extractive fallback
with timeouts, structured logging, and zero secret leakage.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from typing import List, Tuple
from fastapi import HTTPException
from config import settings

logger = logging.getLogger("contextvault.llm")


def build_rag_system_prompt(context: str) -> str:
    """
    Constructs the grounded system prompt ensuring responses cite facts from context only.
    """
    return (
        "You are ContextVault, an expert technical AI research assistant. "
        "Answer the user's question accurately using ONLY the provided context below. "
        "If the answer cannot be determined strictly from the context, explicitly state "
        "'I could not find sufficient information in the indexed documents to answer this question.'\n\n"
        f"Context:\n{context}"
    )


def call_openai_provider(query: str, system_prompt: str) -> Tuple[str, str]:
    """
    Invokes OpenAI Chat Completion API with timeout and error handling.
    """
    api_key = settings.OPENAI_API_KEY.strip()
    if not api_key or api_key == "your_openai_api_key_here":
        raise ValueError("OpenAI API key is not configured")

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=float(settings.LLM_TIMEOUT_SECONDS))
        model_name = settings.OPENAI_MODEL
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            temperature=0.2
        )
        answer = response.choices[0].message.content or ""
        return answer, f"OpenAI ({model_name})"
    except Exception as e:
        # Sanitize error message to guarantee API keys are never exposed in logs or responses
        err_msg = str(e)
        if api_key in err_msg:
            err_msg = err_msg.replace(api_key, "[REDACTED_API_KEY]")
        logger.warning("OpenAI invocation failed: %s (%s)", type(e).__name__, err_msg)
        raise e


def call_ollama_provider(query: str, system_prompt: str) -> Tuple[str, str]:
    """
    Invokes local Ollama generate API with timeout and error handling.
    """
    ollama_url = settings.OLLAMA_BASE_URL.rstrip("/")
    ollama_model = settings.OLLAMA_MODEL

    req_data = json.dumps({
        "model": ollama_model,
        "prompt": f"{system_prompt}\n\nUser Question: {query}\n\nAnswer:",
        "stream": False
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{ollama_url}/api/generate",
        data=req_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=float(settings.LLM_TIMEOUT_SECONDS)) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            return res_json.get("response", ""), f"Ollama ({ollama_model})"
    except Exception as e:
        logger.warning("Ollama invocation failed: %s (%s)", type(e).__name__, str(e))
        raise e


def synthesize_extractive_answer(citations: List[dict]) -> Tuple[str, str]:
    """
    Offline extractive synthesizer that organizes retrieved passages with source citations.
    Requires no external LLM or GPU compute.
    """
    if not citations:
        return (
            "No relevant context found in your documents. Try uploading more documents or rephrasing your search.",
            "ContextVault Extractive Engine"
        )

    summary_lines = [
        "**ContextVault Document Retrieval Engine** synthesized the most relevant passages from your knowledge base:\n"
    ]
    for c in citations:
        loc = f" (Page {c['page']})" if c.get('page') else ""
        content_lines = [line.strip() for line in c.get('content', '').split('\n') if line.strip()]
        quoted_content = "\n> \n> ".join(content_lines)
        summary_lines.append(f"> **[{c.get('source', 'Unknown')}{loc}]**\n> {quoted_content}\n")

    summary_lines.append(
        "\n*Note: Configure an `OPENAI_API_KEY` or start a local `Ollama` instance in `backend/.env` for generative answers.*"
    )
    return "\n".join(summary_lines), "ContextVault Grounded Fallback"


def generate_llm_answer(query: str, context: str, citations: List[dict]) -> Tuple[str, str]:
    """
    Selects and executes the best available LLM provider according to settings.LLM_PROVIDER:
    - 'openai': Strict OpenAI execution (raises 502 on failure)
    - 'ollama': Strict Ollama execution (raises 502 on failure)
    - 'extractive': Direct offline passage compilation
    - 'auto': Attempts OpenAI -> Ollama -> falls back gracefully to extractive
    """
    provider_pref = settings.LLM_PROVIDER.lower().strip()
    system_prompt = build_rag_system_prompt(context)

    # 1. Explicit OpenAI mode
    if provider_pref == "openai":
        try:
            return call_openai_provider(query, system_prompt)
        except Exception as e:
            sanitized = str(e)
            if settings.OPENAI_API_KEY:
                sanitized = sanitized.replace(settings.OPENAI_API_KEY, "[REDACTED_API_KEY]")
            raise HTTPException(status_code=502, detail=f"OpenAI Generation Error: {sanitized}")

    # 2. Explicit Ollama mode
    if provider_pref == "ollama":
        try:
            return call_ollama_provider(query, system_prompt)
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail=f"Could not connect to Ollama at {settings.OLLAMA_BASE_URL}: {str(e)}"
            )

    # 3. Explicit Extractive mode
    if provider_pref == "extractive":
        return synthesize_extractive_answer(citations)

    # 4. Auto mode: Progressive degradation with fallback
    # Step A: Try OpenAI if configured
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your_openai_api_key_here":
        try:
            return call_openai_provider(query, system_prompt)
        except Exception as e:
            logger.info("Auto-mode: OpenAI unavailable (%s). Attempting Ollama fallback.", type(e).__name__)

    # Step B: Try Ollama
    try:
        return call_ollama_provider(query, system_prompt)
    except Exception as e:
        logger.info("Auto-mode: Ollama unavailable (%s). Falling back to extractive synthesizer.", type(e).__name__)

    # Step C: Fallback to Extractive synthesizer
    return synthesize_extractive_answer(citations)
