import os
import shutil
import re
import hashlib
import sys
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend root is always on sys.path for robust imports across environments
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import settings

# Prefer local cached weights to prevent network retry latency
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

DATA_DIR = settings.DATA_DIR
UPLOAD_DIR = settings.resolved_upload_dir
PERSIST_DIRECTORY = settings.resolved_chroma_dir

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PERSIST_DIRECTORY.mkdir(parents=True, exist_ok=True)

# Cache embedding model in memory
_embedding_instance = None
_vector_store_instance = None


def get_embeddings():
    global _embedding_instance
    if _embedding_instance is None:
        model_name = settings.EMBEDDING_MODEL
        # Initialize sentence-transformers embeddings locally
        _embedding_instance = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )
    return _embedding_instance


def get_safe_collection_name(session_id: Any = "default") -> str:
    """
    Derives a Chroma-compliant collection name from a session identifier:
    - 3-63 characters length
    - Starts and ends with an alphanumeric character
    - Contains only [a-zA-Z0-9._-]
    - 'default' session maps to 'context_vault_collection' for seamless backward compatibility.
    """
    if not isinstance(session_id, str) or not session_id.strip() or session_id.strip() == "default":
        return "context_vault_collection"
    cleaned = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id.strip())
    name = f"cv_{cleaned}"[:63]
    while name and not name[-1].isalnum():
        name = name[:-1]
    return name if len(name) >= 3 else "context_vault_collection"


def get_session_upload_dir(session_id: Any = "default") -> Path:
    """
    Returns the isolated upload directory path for the given session.
    Default session uses root UPLOAD_DIR; distinct sessions use isolated subdirectories.
    """
    if not isinstance(session_id, str) or not session_id.strip() or session_id.strip() == "default":
        return UPLOAD_DIR
    cleaned = re.sub(r'[^a-zA-Z0-9_-]', '_', session_id.strip()) or "default"
    session_dir = UPLOAD_DIR / cleaned
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def get_vector_store(session_id: Any = "default") -> Chroma:
    embeddings = get_embeddings()
    collection_name = get_safe_collection_name(session_id)
    return Chroma(
        persist_directory=str(PERSIST_DIRECTORY),
        embedding_function=embeddings,
        collection_name=collection_name,
        collection_metadata={"hnsw:space": "cosine"}
    )


def clean_extracted_text(text: str, is_pdf: bool = False) -> str:
    """
    Sanitizes extracted document text preserving structure:
    - Normalizes Unicode spaces, bullets, and line endings.
    - For non-PDFs (Markdown, TXT), strictly preserves list markers, indentation, and structure.
    - For PDFs (is_pdf=True), unwraps artificial soft line breaks within paragraphs,
      re-unites hyphenated words, and preserves true paragraph breaks (\n\n) and bullet lists.
    """
    if not text:
        return ""

    # Normalize non-breaking spaces, bullets, and line endings
    text = text.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')

    if not is_pdf:
        # Non-PDF text (Markdown, TXT): preserve structure, newlines, list markers, and code indentation
        collapsed = re.sub(r'[ \t]+', ' ', text)
        return re.sub(r'\n{3,}', '\n\n', collapsed).strip()

    # For PDF text:
    # 1. Normalize bullet point characters
    text = text.replace('\u25cf', '- ').replace('\u2022', '- ')

    # 2. Re-unite hyphenated words broken across line wraps (e.g. "distri-\nbuted" -> "distributed")
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)

    # 3. Split by true paragraph breaks (two or more newlines)
    raw_paragraphs = re.split(r'\n\s*\n', text)
    cleaned_paragraphs = []

    bullet_prefixes = ('- ', '* ', '+ ', '• ')

    for para in raw_paragraphs:
        para = para.strip()
        if not para:
            continue

        lines = [line.strip() for line in para.split('\n') if line.strip()]
        if not lines:
            continue

        merged_lines = []
        for line in lines:
            is_bullet = any(line.startswith(p) for p in bullet_prefixes)
            is_numbered = bool(re.match(r'^(?:[0-9]+[.)]|[a-zA-Z][.)]|[ivxIVX]+[.)])', line))
            is_header = line.startswith('#')

            if is_bullet or is_numbered or is_header:
                merged_lines.append(line)
            else:
                # Merge soft line wrap with previous line if it was part of the same paragraph text
                if (
                    merged_lines 
                    and not any(merged_lines[-1].startswith(p) for p in bullet_prefixes)
                    and not bool(re.match(r'^(?:[0-9]+[.)]|[a-zA-Z][.)])', merged_lines[-1]))
                    and not merged_lines[-1].startswith('#')
                ):
                    merged_lines[-1] += " " + line
                else:
                    merged_lines.append(line)

        cleaned_paragraphs.append("\n".join(merged_lines))

    result = "\n\n".join(cleaned_paragraphs)
    result = re.sub(r'[ \t]+', ' ', result)
    return result.strip()


def load_document_file(file_path: str, filename: str):
    """
    Multi-format document loader supporting PDF, Markdown (.md), and plain text (.txt).
    """
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
        docs = loader.load()
        for doc in docs:
            doc.page_content = clean_extracted_text(doc.page_content, is_pdf=True)
    elif ext in [".md", ".txt"]:
        loader = TextLoader(file_path, encoding="utf-8")
        docs = loader.load()
        for doc in docs:
            doc.page_content = clean_extracted_text(doc.page_content, is_pdf=False)
    else:
        loader = TextLoader(file_path, encoding="utf-8", autodetect_encoding=True)
        docs = loader.load()
        for doc in docs:
            doc.page_content = clean_extracted_text(doc.page_content, is_pdf=False)

    return docs


def process_and_add_document(file_path: str, filename: str, session_id: str = "default") -> Dict[str, Any]:
    """
    Ingests a document, breaks it down recursively with overlap, generates embeddings,
    and indexes chunks into ChromaDB with source and session metadata.
    Deduplicates by removing pre-existing chunks for this filename in the session before adding.
    Inserts chunks in batches of 500 to avoid Chroma/SQLite parameter limits.
    """
    docs = load_document_file(file_path, filename)
    if not docs:
        raise ValueError(f"No content could be extracted from '{filename}'.")

    # Compute SHA-256 hash of the file content for deduplication tracking
    with open(file_path, "rb") as f:
        file_sha256 = hashlib.sha256(f.read()).hexdigest()

    # Recursive chunking: balances semantic unit size with overlap to avoid context fragmentation
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=60,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(docs)

    # Attach rich metadata for citations, multi-tenant isolation & deduplication
    for idx, chunk in enumerate(chunks):
        chunk.metadata["source"] = filename
        chunk.metadata["chunk_index"] = idx
        chunk.metadata["sha256"] = file_sha256
        chunk.metadata["session_id"] = session_id
        if "page" in chunk.metadata:
            chunk.metadata["page_number"] = chunk.metadata["page"] + 1

    # Deduplicate: remove any pre-existing chunks for this document name in this session
    delete_document_by_name(filename, session_id=session_id)

    vector_store = get_vector_store(session_id=session_id)

    # Insert in batches of 500 to prevent exceeding Chroma / SQLite parameter limits
    BATCH_SIZE = 500
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i : i + BATCH_SIZE]
        vector_store.add_documents(batch)

    if hasattr(vector_store, "persist"):
        try:
            vector_store.persist()
        except Exception:
            pass

    return {
        "filename": filename,
        "chunk_count": len(chunks),
        "total_characters": sum(len(c.page_content) for c in chunks),
        "sha256": file_sha256
    }


def query_rag(user_query: str, top_k: int = 4, session_id: str = "default") -> Dict[str, Any]:
    """
    Performs similarity search against the session's isolated vector database
    and constructs grounded context with granular citation metadata.
    """
    vector_store = get_vector_store(session_id=session_id)

    # Retrieve top-k chunks with relevance scores if supported
    try:
        results_with_scores = vector_store.similarity_search_with_score(user_query, k=top_k)
        docs = [item[0] for item in results_with_scores]
        scores = [float(item[1]) for item in results_with_scores]
    except Exception:
        retriever = vector_store.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.invoke(user_query) if hasattr(retriever, "invoke") else retriever.get_relevant_documents(user_query)
        scores = [0.0] * len(docs)

    # Relevance filtering: In Chroma cosine space (hnsw:space: cosine),
    # score = cosine distance = 1 - cosine_similarity.
    # Distance <= 1.0 indicates positive semantic alignment (similarity >= 0.0).
    # Distance > 1.0 indicates orthogonal/unrelated noise.
    MAX_COSINE_DISTANCE_THRESHOLD = getattr(settings, "RELEVANCE_THRESHOLD", 1.0)

    citations = []
    sources = set()

    for idx, doc in enumerate(docs):
        # Exclude chunks that are semantically unrelated to the user query
        if idx < len(scores) and scores[idx] > MAX_COSINE_DISTANCE_THRESHOLD:
            continue

        src = doc.metadata.get("source", "Unknown Document")
        sources.add(src)
        page = doc.metadata.get("page_number", doc.metadata.get("page", None))
        chunk_idx = doc.metadata.get("chunk_index", idx)
        cosine_distance = round(scores[idx], 4) if idx < len(scores) else None
        cosine_similarity = round(max(0.0, 1.0 - scores[idx]), 4) if idx < len(scores) else None

        citations.append({
            "id": idx + 1,
            "source": src,
            "page": page,
            "chunk_index": chunk_idx,
            "content": clean_extracted_text(doc.page_content, is_pdf=False),
            "score": cosine_distance,
            "similarity": cosine_similarity,
            "metric": "cosine"
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


def get_indexed_documents(session_id: str = "default") -> List[Dict[str, Any]]:
    """
    Returns unique documents and summary stats currently stored in the session's vector store.
    """
    chroma_db_file = PERSIST_DIRECTORY / "chroma.sqlite3"
    if not chroma_db_file.exists():
        return []

    try:
        vector_store = get_vector_store(session_id=session_id)
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


def delete_document_by_name(filename: str, session_id: str = "default") -> bool:
    """
    Deletes all vector chunks and files associated with a specific document name within the session,
    leaving other indexed documents and sessions intact.
    """
    try:
        vector_store = get_vector_store(session_id=session_id)
        # Delete from Chroma collection where source metadata matches the filename
        if hasattr(vector_store, "_collection"):
            try:
                vector_store._collection.delete(where={"source": filename})
            except Exception:
                pass
        elif hasattr(vector_store, "delete"):
            try:
                vector_store.delete(where={"source": filename})
            except Exception:
                pass

        # Clean up the physical file from session upload folder if present
        session_upload_dir = get_session_upload_dir(session_id=session_id)
        safe_filename = Path(filename).name
        target_file = session_upload_dir / safe_filename
        if target_file.exists() and target_file.is_file():
            target_file.unlink()

        return True
    except Exception as e:
        print(f"Error deleting document '{filename}' in session '{session_id}': {e}")
        return False


def reset_vector_store(session_id: str = "default") -> bool:
    """
    Clears the ChromaDB collection for the specified session and flushes its uploaded cache.
    Leaves other session data and collections completely intact.
    """
    global _vector_store_instance
    try:
        vector_store = get_vector_store(session_id=session_id)
        collection_name = get_safe_collection_name(session_id)
        # Delete collection through Chroma API
        if hasattr(vector_store, "delete_collection"):
            try:
                vector_store.delete_collection()
            except Exception:
                pass
        elif hasattr(vector_store, "_client"):
            try:
                vector_store._client.delete_collection(collection_name)
            except Exception:
                pass

        # Clear session upload directory
        if session_id == "default":
            if UPLOAD_DIR.exists():
                for item in UPLOAD_DIR.iterdir():
                    if item.name == ".gitkeep":
                        continue
                    if item.is_file():
                        item.unlink()
                    elif item.is_dir() and not item.name.startswith("cv_"):
                        shutil.rmtree(item)
        else:
            session_dir = get_session_upload_dir(session_id=session_id)
            if session_dir.exists() and session_dir != UPLOAD_DIR:
                shutil.rmtree(session_dir)

        _vector_store_instance = None
        return True
    except Exception as e:
        print(f"Error resetting vector store for session '{session_id}': {e}")
        return False
