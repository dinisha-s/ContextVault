import os
import shutil
import urllib.request
import json
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from rag_engine import (
    process_and_add_document,
    query_rag,
    get_indexed_documents,
    reset_vector_store,
    UPLOAD_DIR,
)

load_dotenv()

app = FastAPI(
    title="ContextVault API",
    description="Full-Stack Local RAG & Document Intelligence Workstation",
    version="1.0.0"
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str
    top_k: Optional[int] = 4

class ChatResponse(BaseModel):
    query: str
    answer: str
    sources: List[str]
    citations: List[dict]
    provider: str

def generate_llm_answer(query: str, context: str, citations: List[dict]) -> tuple[str, str]:
    """
    Selects the best available LLM provider:
    1. OpenAI (if OPENAI_API_KEY is configured and valid)
    2. Local Ollama (if running on OLLAMA_BASE_URL)
    3. Grounded Context Synthesizer (Zero-dependency local fallback)
    """
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip()
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3").strip()
    provider_pref = os.getenv("LLM_PROVIDER", "auto").lower()

    system_prompt = (
        "You are ContextVault, an expert technical AI research assistant. "
        "Answer the user's question accurately using ONLY the provided context below. "
        "If the answer cannot be determined strictly from the context, explicitly state "
        "'I could not find sufficient information in the indexed documents to answer this question.'\n\n"
        f"Context:\n{context}"
    )

    # 1. Try OpenAI if preferred or auto
    if provider_pref in ["auto", "openai"] and openai_key and openai_key != "your_openai_api_key_here":
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                temperature=0.2
            )
            answer = response.choices[0].message.content
            return answer, f"OpenAI ({model_name})"
        except Exception as e:
            if provider_pref == "openai":
                raise HTTPException(status_code=502, detail=f"OpenAI Generation Error: {str(e)}")

    # 2. Try Local Ollama if configured / running
    if provider_pref in ["auto", "ollama"]:
        try:
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
            with urllib.request.urlopen(req, timeout=12) as response:
                res_json = json.loads(response.read().decode("utf-8"))
                return res_json.get("response", ""), f"Ollama ({ollama_model})"
        except Exception:
            if provider_pref == "ollama":
                raise HTTPException(status_code=502, detail=f"Could not connect to Ollama at {ollama_url}")

    # 3. Grounded Fallback Synthesizer (Extractive RAG)
    # Formats the top matching excerpts cleanly with direct attribution
    if not citations:
        return "No relevant context found in your documents. Try uploading more documents or rephrasing your search.", "ContextVault Extractive Engine"

    summary_lines = [
        "**ContextVault Document Retrieval Engine** synthesized the most relevant passages from your knowledge base:\n"
    ]
    for c in citations:
        loc = f" (Page {c['page']})" if c.get('page') else ""
        summary_lines.append(f"> **[{c['source']}{loc}]**\n> {c['content']}\n")

    summary_lines.append(
        "\n*Note: Configure an `OPENAI_API_KEY` or start a local `Ollama` instance in `backend/.env` for generative answers.*"
    )
    return "\n".join(summary_lines), "ContextVault Grounded Fallback"

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "ContextVault RAG Backend",
        "version": "1.0.0",
        "endpoints": ["/upload", "/chat", "/documents", "/reset"]
    }

@app.get("/documents")
def list_documents():
    """
    Returns list of all documents indexed in the vector store.
    """
    docs = get_indexed_documents()
    return {"documents": docs, "total_documents": len(docs)}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Receives multi-format document (PDF, Markdown, TXT), saves it, and chunks/indexes into ChromaDB.
    """
    allowed_extensions = {".pdf", ".md", ".txt"}
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{file_ext}'. Allowed formats: {', '.join(allowed_extensions)}"
        )

    saved_path = UPLOAD_DIR / file.filename
    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        result = process_and_add_document(str(saved_path), file.filename)
        return {
            "status": "Indexed successfully",
            "filename": result["filename"],
            "chunks": result["chunk_count"],
            "characters": result["total_characters"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion Error: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_documents(request: ChatRequest):
    """
    Queries vector store for top matching semantic passages and produces an answer with citations.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        rag_data = query_rag(request.query, top_k=request.top_k or 4)
        answer, provider = generate_llm_answer(
            query=request.query,
            context=rag_data["context"],
            citations=rag_data["citations"]
        )

        return ChatResponse(
            query=request.query,
            answer=answer,
            sources=rag_data["sources"],
            citations=rag_data["citations"],
            provider=provider
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query Execution Error: {str(e)}")

@app.post("/reset")
def clear_knowledge_base():
    """
    Wipes the vector store and uploaded cache.
    """
    success = reset_vector_store()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reset vector database")
    return {"status": "Vector database and cache reset successfully"}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("BACKEND_HOST", "127.0.0.1")
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
