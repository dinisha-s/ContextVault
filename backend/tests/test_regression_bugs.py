import inspect
import io
import sqlite3
from pathlib import Path
import pytest
from fastapi import HTTPException
import main
import rag_engine


def test_bug_1_reset_clears_uploads_and_avoids_db_lock(client, temp_test_env):
    """
    Bug 1: POST /reset only wiped PERSIST_DIRECTORY with shutil.rmtree;
    it did not clear UPLOAD_DIR, leaving orphaned files on disk.
    """
    uploads_dir = temp_test_env["uploads"]
    dummy_file = uploads_dir / "sample_doc.txt"
    dummy_file.write_text("ContextVault sample document for testing reset.", encoding="utf-8")
    assert dummy_file.exists()

    response = client.post("/reset")
    assert response.status_code == 200

    # The uploads folder must be completely cleared after reset
    remaining_files = list(uploads_dir.iterdir())
    assert len(remaining_files) == 0, f"Expected empty uploads directory, found: {remaining_files}"


def test_bug_2_path_traversal_in_upload_filename(client, temp_test_env):
    """
    Bug 2: An upload filename like '../traversal_test.txt' is joined directly
    with UPLOAD_DIR, writing files outside the designated uploads folder.
    """
    uploads_dir = temp_test_env["uploads"]
    traversal_target = uploads_dir.parent / "traversal_outside.txt"
    if traversal_target.exists():
        traversal_target.unlink()

    file_content = b"Malicious content trying to escape uploads folder"
    client.post(
        "/upload",
        files={"file": ("../traversal_outside.txt", io.BytesIO(file_content), "text/plain")}
    )

    # File must NOT have been written outside uploads_dir
    assert not traversal_target.exists(), "Security vulnerability: file was written outside uploads directory!"


def test_bug_3_blocking_endpoints_declared_as_async():
    """
    Bug 3: CPU-intensive & blocking I/O endpoints (/upload, /chat) were declared
    as 'async def', causing heavy work (embeddings, PyPDF, Chroma) to block FastAPI's event loop.
    They must be plain 'def' (so FastAPI runs them in a threadpool) or use run_in_threadpool.
    """
    assert not inspect.iscoroutinefunction(main.upload_document), (
        "/upload is declared 'async def' but performs blocking I/O and CPU embeddings. "
        "Use plain 'def' so FastAPI executes it in the threadpool."
    )
    assert not inspect.iscoroutinefunction(main.chat_with_documents), (
        "/chat is declared 'async def' but performs blocking vector search and LLM calls. "
        "Use plain 'def' so FastAPI executes it in the threadpool."
    )


def test_bug_4_conversational_and_catalog_router_swallows_real_queries():
    """
    Bug 4: The intent router uses broad substring checks that swallow real questions:
    - 'thank you, but what does the document say about caching?' is swallowed by 'thank'
    - 'what data is stored in the database file?' is swallowed by catalog query logic
    """
    # Real question starting with appreciation
    query_caching = "thank you, but what does the document say about caching?"
    caching_intent = main.check_conversational_intent(query_caching)
    assert caching_intent is None, (
        f"Conversational intent swallowed a real question! Returned: {caching_intent}"
    )

    # Real question asking about database file contents
    query_db_content = "what data is stored in the database file?"
    is_catalog = main.is_document_catalog_query(query_db_content)
    assert is_catalog is False, (
        "Catalog router falsely intercepted content question 'what data is stored in the database file?'"
    )


def test_bug_5_clean_extracted_text_mangles_markdown_and_code():
    """
    Bug 5: clean_extracted_text applies an aggressive < 3 avg words/line check
    that collapses Markdown lists and multi-line code snippets into a single line.
    """
    markdown_list = "- item 1\n- item 2\n- item 3"
    cleaned_md = rag_engine.clean_extracted_text(markdown_list)
    assert "\n" in cleaned_md, f"Markdown list was collapsed into a single line: {cleaned_md!r}"

    code_snippet = "def foo():\n    pass\n    return 1"
    cleaned_code = rag_engine.clean_extracted_text(code_snippet)
    assert "pass\n" in cleaned_code or "    pass" in cleaned_code, (
        f"Code block lines were merged: {cleaned_code!r}"
    )


def test_bug_6_shipped_chroma_index_contains_stale_fragmented_tokens():
    """
    Bug 6: The shipped Chroma collection in backend/data/chroma_db contains chunks
    indexed by older code where words were split by '\\n \\n'.
    """
    real_db_path = Path(__file__).resolve().parent.parent / "data" / "chroma_db"
    sqlite_file = real_db_path / "chroma.sqlite3"
    if not sqlite_file.exists():
        pytest.skip("No shipped Chroma DB file found on disk.")

    conn = sqlite3.connect(str(sqlite_file))
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT c0 FROM embedding_fulltext_search_content LIMIT 10")
        rows = cursor.fetchall()
        fragmented_chunks = [
            r[0] for r in rows if r[0] and "\n \n" in r[0]
        ]
        assert len(fragmented_chunks) == 0, (
            f"Shipped Chroma index has {len(fragmented_chunks)} stale chunks with per-word '\\n \\n' fragmentation! "
            f"Sample: {fragmented_chunks[0][:60]!r}"
        )
    finally:
        conn.close()


def test_bug_7a_reuploading_duplicates_chunks(client, temp_test_env):
    """
    Bug 7a: Re-uploading the same file duplicates chunks in vector store.
    """
    file_content = b"ContextVault deduplication test content with multiple terms."
    res1 = client.post("/upload", files={"file": ("dedup_test.txt", io.BytesIO(file_content), "text/plain")})
    assert res1.status_code == 200
    chunks_after_first = res1.json()["chunks"]

    # Re-upload same file
    res2 = client.post("/upload", files={"file": ("dedup_test.txt", io.BytesIO(file_content), "text/plain")})
    assert res2.status_code == 200

    docs_res = client.get("/documents").json()
    doc_entry = next((d for d in docs_res.get("documents", []) if d["filename"] == "dedup_test.txt"), None)
    assert doc_entry is not None
    # Re-upload must NOT double chunk count
    assert doc_entry["chunk_count"] == chunks_after_first, (
        f"Chunk count duplicated! Expected {chunks_after_first}, got {doc_entry['chunk_count']}"
    )


def test_bug_7c_empty_file_returns_400_and_leaves_no_orphans(client, temp_test_env):
    """
    Bug 7c: Uploading an empty file returns 500 Internal Server Error instead of 400,
    and leaves an orphan 0-byte file on disk.
    """
    empty_upload = client.post(
        "/upload",
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    )
    assert empty_upload.status_code == 400, (
        f"Empty file upload must return 400 Bad Request, got {empty_upload.status_code}: {empty_upload.text}"
    )
    uploads_dir = temp_test_env["uploads"]
    assert not (uploads_dir / "empty.txt").exists(), "Empty upload failed but left an orphan file on disk!"


def test_bug_8a_http_exception_passed_through_without_wrapping_as_500(client, temp_test_env, monkeypatch):
    """
    Bug 8a: HTTPException(502) raised in generate_llm_answer is re-wrapped as 500 in /chat.
    """
    def mock_raise_502(query, context, citations):
        raise HTTPException(status_code=502, detail="Upstream LLM unavailable")

    monkeypatch.setattr(main, "generate_llm_answer", mock_raise_502)
    chat_res = client.post("/chat", json={"query": "test query for error wrapping"})
    assert chat_res.status_code == 502, (
        f"Expected HTTPException status 502 to pass through, but got {chat_res.status_code}: {chat_res.text}"
    )


def test_bug_8b_delete_nonexistent_document_returns_404(client, temp_test_env):
    """
    Bug 8b: DELETE of a non-existent document returns 200 instead of 404.
    """
    del_res = client.delete("/documents/nonexistent_document_12345.pdf")
    assert del_res.status_code == 404, (
        f"Deleting a nonexistent document must return 404 Not Found, got {del_res.status_code}: {del_res.text}"
    )


def test_bug_8c_chat_request_validates_top_k(client, temp_test_env):
    """
    Bug 8c: ChatRequest does not validate top_k (accepts 99999).
    """
    invalid_top_k = client.post("/chat", json={"query": "valid query", "top_k": 99999})
    assert invalid_top_k.status_code == 422, (
        f"top_k=99999 must fail Pydantic validation with 422 Unprocessable Entity, got {invalid_top_k.status_code}"
    )
