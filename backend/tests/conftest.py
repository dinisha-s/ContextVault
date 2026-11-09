import sys
import hashlib
from pathlib import Path
from typing import List
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main
import rag_engine


class DeterministicFakeEmbeddings:
    """
    Deterministic fake embedder producing repeatable 384-dimensional unit vectors.
    Allows running the entire test suite in milliseconds without downloading model weights.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def _embed(self, text: str) -> List[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        vec = []
        for i in range(self.dimension):
            byte_val = digest[i % len(digest)]
            vec.append((byte_val - 128.0) / 128.0)
        norm = sum(x * x for x in vec) ** 0.5 or 1.0
        return [x / norm for x in vec]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._embed(text)


@pytest.fixture
def fake_embedder():
    return DeterministicFakeEmbeddings()


@pytest.fixture
def temp_test_env(tmp_path, monkeypatch, fake_embedder):
    """
    Creates an isolated temporary test sandbox for uploads and ChromaDB.
    Guarantees tests never touch real database or uploaded documents.
    """
    test_data_dir = tmp_path / "test_data"
    test_upload_dir = test_data_dir / "uploads"
    test_chroma_dir = test_data_dir / "chroma_db"
    test_upload_dir.mkdir(parents=True, exist_ok=True)
    test_chroma_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(rag_engine, "PERSIST_DIRECTORY", test_chroma_dir)
    monkeypatch.setattr(rag_engine, "UPLOAD_DIR", test_upload_dir)
    monkeypatch.setattr(main, "UPLOAD_DIR", test_upload_dir)
    monkeypatch.setattr(rag_engine, "_embedding_instance", fake_embedder)
    monkeypatch.setattr(rag_engine, "get_embeddings", lambda: fake_embedder)

    yield {
        "root": test_data_dir,
        "uploads": test_upload_dir,
        "chroma": test_chroma_dir,
        "embedder": fake_embedder
    }


@pytest.fixture
def client(temp_test_env):
    """
    FastAPI TestClient bound to the temporary sandbox environment.
    """
    return TestClient(main.app)
