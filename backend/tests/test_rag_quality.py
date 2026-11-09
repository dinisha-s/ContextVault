"""
Step 4 Verification Tests: RAG Quality & Cosine Space
Tests covering:
- Chroma vector store configured with true cosine space (hnsw:space: cosine)
- True cosine distance and cosine similarity metric calculations
- Semantic relevance threshold filtering (filtering out distance > threshold)
- Verification that responses cite source metadata and contain zero unverified marketing claims
"""

import io
import pytest
import rag_engine
import main
from config import settings


def test_chroma_collection_space_is_cosine(temp_test_env):
    """
    Chroma vector collection must be created with explicit metadata
    specifying 'hnsw:space': 'cosine' rather than the default squared L2.
    """
    store = rag_engine.get_vector_store()
    collection_meta = store._collection.metadata
    assert collection_meta is not None, "Collection metadata is None; expected hnsw:space: cosine"
    assert collection_meta.get("hnsw:space") == "cosine", (
        f"Expected 'hnsw:space': 'cosine', but found: {collection_meta.get('hnsw:space')}"
    )


def test_cosine_similarity_and_distance_metric_in_citations(client, temp_test_env):
    """
    Queries must return citations containing:
    - 'metric': 'cosine'
    - 'score': cosine distance (lower is closer)
    - 'similarity': calculated cosine similarity (1 - distance)
    """
    doc_content = "Raspberry Pi 4 Model B requires a 5V 3A USB-C power supply."
    res_upload = client.post(
        "/upload",
        files={"file": ("power_specs.txt", io.BytesIO(doc_content.encode("utf-8")), "text/plain")}
    )
    assert res_upload.status_code == 200

    # Query with matching text to verify citation score structure
    chat_res = client.post(
        "/chat",
        json={"query": "Raspberry Pi 4 Model B requires a 5V 3A USB-C power supply.", "top_k": 3}
    )
    assert chat_res.status_code == 200
    data = chat_res.json()

    assert len(data["citations"]) > 0, "Expected at least one citation for matching query"
    first_citation = data["citations"][0]

    assert first_citation["metric"] == "cosine"
    assert "score" in first_citation
    assert "similarity" in first_citation

    # Validate mathematical bounds for cosine similarity and distance
    assert first_citation["score"] is not None
    assert first_citation["similarity"] is not None
    assert 0.0 <= first_citation["similarity"] <= 1.0, (
        f"Cosine similarity must be bounded between 0 and 1, got {first_citation['similarity']}"
    )


def test_relevance_threshold_filtering(temp_test_env, monkeypatch):
    """
    Verify that query_rag drops passages whose cosine distance exceeds RELEVANCE_THRESHOLD.
    """
    doc_content = "Distributed database replication strategies using Paxos and Raft consensus protocols."
    target_path = temp_test_env["uploads"] / "consensus.txt"
    target_path.write_text(doc_content, encoding="utf-8")
    rag_engine.process_and_add_document(str(target_path), "consensus.txt")

    # 1. Exact match query has distance ~ 0.0 -> must be retrieved
    match_result = rag_engine.query_rag(doc_content, top_k=2)
    assert len(match_result["citations"]) > 0
    assert match_result["citations"][0]["score"] <= 0.1

    # 2. When threshold is set strictly lower than unrelated query distance, chunks are dropped
    monkeypatch.setattr(settings, "RELEVANCE_THRESHOLD", 0.0001)

    filtered_result = rag_engine.query_rag("Completely unrelated query that has non-zero distance", top_k=2)
    assert len(filtered_result["citations"]) == 0, "Unrelated query should be filtered out by strict threshold"


def test_no_unverified_claims_in_responses(client):
    """
    Verify that system messages, chat responses, and endpoints never emit
    unverified marketing claims like 'zero hallucination' or 'sub-15ms'.
    """
    greetings_res = client.post("/chat", json={"query": "hello"})
    assert greetings_res.status_code == 200
    greeting_text = greetings_res.json()["answer"].lower()

    unverified_claims = [
        "zero hallucination",
        "sub-15ms",
        "strictly anchored",
        "conversational agent",
        "catalog intelligence"
    ]
    for claim in unverified_claims:
        assert claim not in greeting_text, f"Response contains unverified claim '{claim}'"
        assert claim not in greetings_res.json()["provider"].lower(), f"Provider contains unverified claim '{claim}'"
