import os
import shutil
import json
import sys
import re
import uuid
import logging
from pathlib import Path

# Ensure backend root is always on sys.path for robust imports across environments
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from llm_providers import generate_llm_answer
from rag_engine import (
    process_and_add_document,
    query_rag,
    get_indexed_documents,
    reset_vector_store,
    delete_document_by_name,
    UPLOAD_DIR,
)

# Setup structured logger
logger = logging.getLogger("contextvault")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

app = FastAPI(
    title="ContextVault API",
    description="Full-Stack Local RAG & Document Intelligence Workstation",
    version="1.0.0"
)

# Enable CORS for local Vite frontend with configurable origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="User search query")
    top_k: Optional[int] = Field(default=4, ge=1, le=10, description="Number of results (1 to 10)")


class ChatResponse(BaseModel):
    query: str
    answer: str
    sources: List[str]
    citations: List[dict]
    provider: str


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "ContextVault RAG Backend",
        "version": "1.0.0",
        "endpoints": ["/upload", "/chat", "/documents", "/reset", "/config"]
    }


@app.get("/config")
@app.get("/api/config")
def get_public_config():
    """
    Returns public backend configuration so frontend dynamically adapts
    instead of hardcoding model names or file limits.
    """
    return {
        "embedding_model": settings.EMBEDDING_MODEL,
        "llm_provider": settings.LLM_PROVIDER,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
        "max_upload_size_bytes": settings.max_upload_size_bytes,
        "supported_formats": [".pdf", ".md", ".txt"],
    }


@app.get("/documents")
def list_documents():
    """
    Returns list of all documents indexed in the vector store.
    """
    docs = get_indexed_documents()
    return {"documents": docs, "total_documents": len(docs)}


@app.post("/upload")
def upload_document(file: UploadFile = File(...)):
    """
    Receives multi-format document (PDF, Markdown, TXT), validates content and size,
    streams into server-generated UUID file, and indexes into ChromaDB.
    Enforces MAX_UPLOAD_SIZE_MB hard limit and runs in threadpool.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty")

    # Clean display filename and extract lowercase extension
    display_filename = Path(file.filename).name
    file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = {".pdf", ".md", ".txt"}

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{file_ext}'. Allowed formats: {', '.join(allowed_extensions)}"
        )

    # Store file under server-generated UUID to eliminate path traversal vulnerabilities
    stored_filename = f"{uuid.uuid4().hex}{file_ext}"
    saved_path = UPLOAD_DIR / stored_filename

    total_bytes = 0
    max_bytes = settings.max_upload_size_bytes
    header_sample = bytearray()

    try:
        with open(saved_path, "wb") as buffer:
            while chunk := file.file.read(65536):
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed upload size of {settings.MAX_UPLOAD_SIZE_MB}MB."
                    )
                buffer.write(chunk)
                if len(header_sample) < 4096:
                    header_sample.extend(chunk[:4096 - len(header_sample)])

        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes)")

        # Validate basic file content
        if file_ext == ".pdf":
            if not bytes(header_sample).startswith(b"%PDF"):
                raise HTTPException(status_code=400, detail="Invalid PDF file: corrupted or missing PDF signature")
        elif file_ext in [".md", ".txt"]:
            try:
                with open(saved_path, "rb") as f:
                    f.read().decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="Invalid text file: file contains non-UTF-8 characters")

        result = process_and_add_document(str(saved_path), display_filename)
        return {
            "status": "Indexed successfully",
            "filename": result["filename"],
            "chunks": result["chunk_count"],
            "characters": result["total_characters"],
            "sha256": result.get("sha256")
        }
    except HTTPException:
        if saved_path.exists():
            saved_path.unlink()
        raise
    except Exception as e:
        if saved_path.exists():
            saved_path.unlink()
        raise HTTPException(status_code=400, detail=f"Ingestion Error: {str(e)}")


def check_conversational_intent(query: str) -> Optional[str]:
    """
    Restricted to exact-match whole-message greetings and basic identity questions only.
    Never swallows real questions or queries with substantive words.
    """
    q = query.lower().strip().rstrip("?.! ")
    
    greetings = {
        "hi", "hello", "hey", "hola", "namaste", "vanakkam",
        "good morning", "good afternoon", "good evening",
        "hi contextvault", "hello contextvault"
    }
    if q in greetings:
        return (
            "Hello! I am ContextVault, your document research assistant.\n\n"
            "Ask a question about your uploaded documents, and I will find the relevant passages with exact citations."
        )

    if q in {"who are you", "what are you", "what can you do", "help", "what is contextvault"}:
        return (
            "I am ContextVault, an offline-first RAG (Retrieval-Augmented Generation) document intelligence system.\n\n"
            "Upload `.pdf`, `.md`, or `.txt` documents to ask questions and retrieve grounded answers with citations."
        )

    if q in {"thanks", "thank you", "thx"}:
        return "You're very welcome! Feel free to ask whenever you need information from your documents."

    if q in {"bye", "goodbye"}:
        return "Goodbye! Have a great day ahead. Your documents remain indexed whenever you return."

    return None


def is_document_catalog_query(query: str) -> bool:
    """
    Restricted to exact triggers asking to list or inspect catalog documents.
    Never matches content queries such as 'what data is stored in the database file?'.
    """
    q = query.lower().strip().rstrip("?.! ")
    exact_catalog_triggers = {
        "what are the documents",
        "what are the indexed documents",
        "what documents are in the indexed",
        "what are the files",
        "what documents are indexed",
        "what documents do i have",
        "what documents do you have",
        "what is in the indexed document",
        "what is in the indexed documents",
        "which documents are indexed",
        "which documents are uploaded",
        "list the documents",
        "list all documents",
        "list indexed documents",
        "show indexed documents",
        "show all documents",
        "show my documents",
        "what files are uploaded",
        "what files are indexed",
        "documents in the indexed document",
        "documents in the indexed documents"
    }
    return q in exact_catalog_triggers


@app.post("/chat", response_model=ChatResponse)
def chat_with_documents(request: ChatRequest):
    """
    Queries vector store for top matching semantic passages and produces an answer with citations.
    Runs in threadpool (plain def) to keep event loop responsive.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Conversational chit-chat & greeting routing (exact match only)
    chat_intent_reply = check_conversational_intent(request.query)
    if chat_intent_reply:
        return ChatResponse(
            query=request.query,
            answer=chat_intent_reply,
            sources=[],
            citations=[],
            provider="ContextVault Conversational Agent"
        )

    # Smart Routing: If user is explicitly asking to list documents
    if is_document_catalog_query(request.query):
        docs = get_indexed_documents()
        if not docs:
            return ChatResponse(
                query=request.query,
                answer=(
                    "**No Documents Indexed Yet**\n\n"
                    "Your ContextVault knowledge base is currently empty. "
                    "You can upload `.pdf`, `.md`, or `.txt` files using the upload button in the left sidebar to start indexing documents."
                ),
                sources=[],
                citations=[],
                provider="ContextVault Catalog Intelligence"
            )
        
        doc_items = "\n".join(
            f"1. **{d['filename']}** - `{d['chunk_count']}` indexed chunks"
            for d in docs
        )
        total_chunks = sum(d['chunk_count'] for d in docs)
        
        answer = (
            f"**Indexed Documents in ContextVault ({len(docs)} Total)**\n\n"
            f"Here are the active documents currently indexed and searchable in your knowledge base:\n\n"
            f"{doc_items}\n\n"
            f"**Total Vector Chunks:** `{total_chunks}`\n\n"
            f"*Tip: You can ask specific questions about any of these documents!*"
        )
        return ChatResponse(
            query=request.query,
            answer=answer,
            sources=[d["filename"] for d in docs],
            citations=[],
            provider="ContextVault Catalog Intelligence"
        )

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
    except HTTPException:
        # Pass HTTPException (such as 502 from upstream LLM) through without re-wrapping as 500
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query Execution Error: {str(e)}")


@app.delete("/documents/{filename}")
def delete_single_document(filename: str):
    """
    Deletes all vector chunks and files belonging to a specific document.
    Returns 404 if the document does not exist.
    """
    existing_docs = get_indexed_documents()
    exists = any(d["filename"] == filename for d in existing_docs)

    safe_filename = Path(filename).name
    target_file = UPLOAD_DIR / safe_filename

    if not exists and not target_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Document '{filename}' not found"
        )

    success = delete_document_by_name(filename)
    if not success:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document '{filename}' from vector database"
        )
    return {"status": f"Document '{filename}' deleted successfully", "filename": filename}


@app.post("/reset")
def clear_knowledge_base():
    """
    Wipes the vector store and uploaded cache.
    """
    success = reset_vector_store()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reset vector database")
    return {"status": "Vector database and cache reset successfully"}


# Serve frontend production bundle if built
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
