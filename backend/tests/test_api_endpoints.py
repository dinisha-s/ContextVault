import unittest
import sys
import io
import os
from pathlib import Path

# Force offline embeddings & extractive LLM fallback for fast automated testing
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["LLM_PROVIDER"] = "extractive"

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi import HTTPException, UploadFile
from main import (
    health_check,
    list_documents,
    upload_document,
    chat_with_documents,
    delete_single_document,
    ChatRequest
)

def run_coro(coro):
    """
    Executes a synchronous-backed coroutine without spawning thread loops on Windows.
    """
    try:
        coro.send(None)
    except StopIteration as stop:
        return stop.value

class TestAPIEndpoints(unittest.TestCase):
    """
    Integration tests for ContextVault REST API endpoints:
    - /health (Service readiness and version)
    - /documents (Listing of indexed documents)
    - /upload (Input validation & extension security)
    - /chat (Query validation & response schema)
    - /documents/{filename} (Individual document deletion)
    """

    def setUp(self):
        os.environ["LLM_PROVIDER"] = "extractive"

    def test_health_check_endpoint(self):
        """
        GET /health should return 200 OK and service metadata.
        """
        data = health_check()
        self.assertEqual(data.get("status"), "online")
        self.assertEqual(data.get("service"), "ContextVault RAG Backend")
        self.assertEqual(data.get("version"), "1.0.0")
        self.assertIn("/upload", data.get("endpoints", []))

    def test_list_documents_endpoint(self):
        """
        GET /documents should return an indexed documents list.
        """
        data = list_documents()
        self.assertIn("documents", data)
        self.assertIn("total_documents", data)
        self.assertIsInstance(data["documents"], list)

    def test_upload_invalid_file_extension(self):
        """
        POST /upload with an unsupported extension (e.g. .csv or .exe)
        must raise an HTTPException with status 400 Bad Request.
        """
        dummy_file = io.BytesIO(b"executable-binary-content")
        upload_file = UploadFile(file=dummy_file, filename="malicious.exe")
        
        with self.assertRaises(HTTPException) as ctx:
            run_coro(upload_document(upload_file))
        
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Unsupported format", ctx.exception.detail)

    def test_chat_empty_query_validation(self):
        """
        POST /chat with an empty or whitespace string must raise HTTP 400.
        """
        with self.assertRaises(HTTPException) as ctx:
            run_coro(chat_with_documents(ChatRequest(query="   ", top_k=4)))
        
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Query cannot be empty", ctx.exception.detail)

    def test_chat_valid_query(self):
        """
        POST /chat with a valid query should return a structured response
        containing answer, sources, citations, and provider.
        """
        response = run_coro(chat_with_documents(ChatRequest(query="What is caching?", top_k=2)))
        
        # Verify response attributes
        answer_text = response.answer if hasattr(response, "answer") else response["answer"]
        citations = response.citations if hasattr(response, "citations") else response["citations"]
        provider = response.provider if hasattr(response, "provider") else response["provider"]

        self.assertGreater(len(answer_text), 0)
        self.assertIsInstance(citations, list)
        self.assertIn("ContextVault", provider)

    def test_delete_single_document(self):
        """
        DELETE /documents/{filename} should succeed and remove chunks by source.
        """
        result = delete_single_document("test_temporary_target.txt")
        self.assertIn("status", result)
        self.assertIn("deleted successfully", result["status"])

if __name__ == "__main__":
    unittest.main()
