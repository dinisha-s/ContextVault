import os
import shutil
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Prefer local cached weights to prevent network retry latency
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

DATA_DIR = Path(__file__).resolve().parent / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
PERSIST_DIRECTORY = DATA_DIR / "chroma_db"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PERSIST_DIRECTORY.mkdir(parents=True, exist_ok=True)

# Cache embedding model in memory
_embedding_instance = None

def get_embeddings():
    global _embedding_instance
    if _embedding_instance is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        # Initialize sentence-transformers embeddings locally
        _embedding_instance = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )
    return _embedding_instance

def get_vector_store() -> Chroma:
    embeddings = get_embeddings()
    return Chroma(
        persist_directory=str(PERSIST_DIRECTORY),
        embedding_function=embeddings,
        collection_name="context_vault_collection"
    )

def clean_extracted_text(text: str) -> str:
    """
    Sanitizes extracted document text.
    Fixes irregular PDF token fragmentation where words are split across single lines,
    normalizes excessive whitespace, and preserves clean paragraph structures.
    """
    if not text:
        return ""
    
    # Normalize non-breaking spaces and line endings
    text = text.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return ""
    
    # Calculate average word count per line
    avg_words = sum(len(line.split()) for line in lines) / len(lines)
    
    if avg_words < 3.0:
        # Detected irregular single-word or short-phrase line breaks from PDF extraction
        merged_paragraphs = []
        current_chunk = []
        
        for line in lines:
            current_chunk.append(line)
            # Break paragraph on standard sentence endings or when accumulated enough words
            if line.endswith(('.', ':', '?', '!')) or len(current_chunk) >= 14:
                merged_paragraphs.append(" ".join(current_chunk))
                current_chunk = []
        
        if current_chunk:
            merged_paragraphs.append(" ".join(current_chunk))
        
        return "\n\n".join(merged_paragraphs)
    else:
        # Standard text: collapse multiple spaces and 3+ blank lines
        collapsed = re.sub(r'[ \t]+', ' ', text)
        return re.sub(r'\n{3,}', '\n\n', collapsed).strip()

def load_document_file(file_path: str, filename: str):
    """
    Multi-format document loader supporting PDF, Markdown (.md), and plain text (.txt).
    """
    ext = Path(filename).suffix.lower()
    
    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
        docs = loader.load()
    elif ext in [".md", ".txt"]:
        loader = TextLoader(file_path, encoding="utf-8")
        docs = loader.load()
    else:
        # Fallback to UTF-8 text loader
        loader = TextLoader(file_path, encoding="utf-8", autodetect_encoding=True)
        docs = loader.load()

    # Clean and sanitize extracted text across all pages/documents
    for doc in docs:
        doc.page_content = clean_extracted_text(doc.page_content)
        
    return docs

def process_and_add_document(file_path: str, filename: str) -> Dict[str, Any]:
    """
    Ingests a document, breaks it down recursively with overlap, generates embeddings,
    and indexes chunks into ChromaDB with source metadata.
    """
    docs = load_document_file(file_path, filename)
    if not docs:
        raise ValueError(f"No content could be extracted from '{filename}'.")

    # Recursive chunking: balances semantic unit size with overlap to avoid context fragmentation
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=60,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(docs)

    # Attach rich metadata for citations
    for idx, chunk in enumerate(chunks):
        chunk.metadata["source"] = filename
        chunk.metadata["chunk_index"] = idx
        if "page" in chunk.metadata:
            chunk.metadata["page_number"] = chunk.metadata["page"] + 1

    vector_store = get_vector_store()
    vector_store.add_documents(chunks)
    if hasattr(vector_store, "persist"):
        try:
            vector_store.persist()
        except Exception:
            pass

    return {
        "filename": filename,
        "chunk_count": len(chunks),
        "total_characters": sum(len(c.page_content) for c in chunks)
    }

def query_rag(user_query: str, top_k: int = 4) -> Dict[str, Any]:
    """
    Performs cosine similarity search against local vector database
    and constructs grounded context with granular citation metadata.
    """
    vector_store = get_vector_store()
    
    # Retrieve top-k chunks with relevance scores if supported
    try:
        results_with_scores = vector_store.similarity_search_with_score(user_query, k=top_k)
        docs = [item[0] for item in results_with_scores]
        scores = [float(item[1]) for item in results_with_scores]
    except Exception:
        retriever = vector_store.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.invoke(user_query) if hasattr(retriever, "invoke") else retriever.get_relevant_documents(user_query)
        scores = [0.0] * len(docs)

    # Relevance filtering: L2 distance > 1.35 indicates unrelated noise
    MAX_L2_DISTANCE_THRESHOLD = 1.35

    citations = []
    sources = set()

    for idx, doc in enumerate(docs):
        # Exclude chunks that are semantically unrelated to the user query
        if idx < len(scores) and scores[idx] > MAX_L2_DISTANCE_THRESHOLD:
            continue

        src = doc.metadata.get("source", "Unknown Document")
        sources.add(src)
        page = doc.metadata.get("page_number", doc.metadata.get("page", None))
        chunk_idx = doc.metadata.get("chunk_index", idx)

        citations.append({
            "id": idx + 1,
            "source": src,
            "page": page,
            "chunk_index": chunk_idx,
            "content": clean_extracted_text(doc.page_content),
            "score": round(scores[idx], 4) if idx < len(scores) else None
        })

    # Merge context with clean demarcations
    formatted_chunks = []
    for c in citations:
        page_info = f", Page {c['page']}" if c.get("page") else ""
        formatted_chunks.append(f"[Source: {c['source']}{page_info}]\n{c['content']}")
    context = "\n\n---\n\n".join(formatted_chunks)

    return {
        "query": user_query,
        "context": context,
        "sources": sorted(list(sources)),
        "citations": citations,
        "raw_doc_count": len(docs)
    }

def get_indexed_documents() -> List[Dict[str, Any]]:
    """
    Returns unique documents and summary stats currently stored in the vector store.
    """
    # Fast path: if vector database has not been initialized yet, return immediately
    chroma_db_file = PERSIST_DIRECTORY / "chroma.sqlite3"
    if not chroma_db_file.exists():
        return []

    try:
        vector_store = get_vector_store()
        data = vector_store.get()
        metadatas = data.get("metadatas", [])
        if not metadatas:
            return []

        doc_summary: Dict[str, int] = {}
        for m in metadatas:
            if m and "source" in m:
                src = m["source"]
                doc_summary[src] = doc_summary.get(src, 0) + 1

        return [
            {"filename": name, "chunk_count": count}
            for name, count in doc_summary.items()
        ]
    except Exception:
        return []

def delete_document_by_name(filename: str) -> bool:
    """
    Deletes all vector chunks and files associated with a specific document name,
    leaving other indexed documents intact.
    """
    try:
        vector_store = get_vector_store()
        # Delete from Chroma collection where source metadata matches the filename
        if hasattr(vector_store, "_collection"):
            vector_store._collection.delete(where={"source": filename})
        elif hasattr(vector_store, "delete"):
            vector_store.delete(where={"source": filename})
        
        # Clean up the physical file from uploads folder if present
        safe_filename = Path(filename).name
        target_file = UPLOAD_DIR / safe_filename
        if target_file.exists() and target_file.is_file():
            target_file.unlink()

        return True
    except Exception as e:
        print(f"Error deleting document '{filename}': {e}")
        return False

def reset_vector_store():
    """
    Clears the ChromaDB collection and storage folder.
    """
    global _embedding_instance
    try:
        if PERSIST_DIRECTORY.exists():
            shutil.rmtree(PERSIST_DIRECTORY)
        PERSIST_DIRECTORY.mkdir(parents=True, exist_ok=True)
        return True
    except Exception as e:
        return False
