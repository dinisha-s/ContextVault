"""
ContextVault Retrieval Evaluation Benchmark
Computes Hit@1, Hit@4, and Mean Reciprocal Rank (MRR) on the real sentence-transformer model.
Reads question/expected-source pairs from a JSON dataset and evaluates retrieval accuracy.
"""

import sys
import os
import json
import time
from pathlib import Path

# Add project root and backend to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from rag_engine import get_vector_store, get_indexed_documents, process_and_add_document, DATA_DIR

def run_retrieval_eval(dataset_path: Path, session_id: str = "default"):
    if not dataset_path.exists():
        print(f"Error: Dataset not found at {dataset_path}")
        return 1

    with open(dataset_path, "r", encoding="utf-8") as f:
        eval_items = json.load(f)

    print("\n" + "=" * 80)
    print(" CONTEXTVAULT RETRIEVAL ACCURACY BENCHMARK (REAL MODEL EVALUATION)")
    print("=" * 80)
    print(f"Dataset      : {dataset_path.name} ({len(eval_items)} evaluation queries)")
    print(f"Session ID   : {session_id}")

    # Check if session has indexed documents; if empty, index sample documents
    docs = get_indexed_documents(session_id=session_id)
    if not docs:
        print("\nNotice: Session collection is empty. Ingesting pre-bundled sample documents...")
        sample_dir = DATA_DIR / "sample_documents"
        for sample_file in sample_dir.glob("*.*"):
            if sample_file.suffix.lower() in [".pdf", ".md", ".txt"]:
                print(f" -> Indexing {sample_file.name}...")
                process_and_add_document(str(sample_file), sample_file.name, session_id=session_id)
        docs = get_indexed_documents(session_id=session_id)

    total_chunks = sum(d.get("chunk_count", 0) for d in docs)
    print(f"Corpus Size  : {len(docs)} documents ({total_chunks} total chunks in ChromaDB)")
    print("-" * 80)

    vector_store = get_vector_store(session_id=session_id)

    hit_1_count = 0
    hit_4_count = 0
    reciprocal_ranks = []
    distances = []

    print(f"{'ID':<4} | {'Expected Source':<24} | {'Top-1 Retrieved':<24} | {'Hit@1':<6} | {'Hit@4':<6} | {'Dist':<6}")
    print("-" * 80)

    start_time = time.time()

    for item in eval_items:
        q_id = item.get("id", "-")
        query = item["question"]
        expected_src = Path(item["expected_source"]).name.lower()

        # Execute cosine similarity search with score on real ChromaDB index
        results = vector_store.similarity_search_with_score(query, k=4)

        if not results:
            print(f"{q_id:<4} | {expected_src:<24} | {'[NO RESULTS]':<24} | {'NO':<6} | {'NO':<6} | {'-':<6}")
            reciprocal_ranks.append(0.0)
            continue

        # Extract retrieved filenames
        retrieved_sources = [
            Path(doc.metadata.get("source", "")).name.lower()
            for doc, _ in results
        ]
        top1_src = retrieved_sources[0] if retrieved_sources else "none"
        top1_dist = results[0][1]

        # Check Hit@1
        is_hit_1 = (top1_src == expected_src)
        if is_hit_1:
            hit_1_count += 1
            distances.append(top1_dist)

        # Check Hit@4 and rank
        is_hit_4 = False
        rr = 0.0
        for rank_idx, src in enumerate(retrieved_sources, start=1):
            if src == expected_src:
                is_hit_4 = True
                rr = 1.0 / rank_idx
                break

        if is_hit_4:
            hit_4_count += 1

        reciprocal_ranks.append(rr)

        h1_label = "YES" if is_hit_1 else "no"
        h4_label = "YES" if is_hit_4 else "no"
        dist_label = f"{top1_dist:.3f}" if top1_dist is not None else "N/A"

        print(f"{q_id:<4} | {expected_src:<24} | {top1_src:<24} | {h1_label:<6} | {h4_label:<6} | {dist_label:<6}")

    total_queries = len(eval_items)
    elapsed_time = time.time() - start_time
    avg_latency_ms = (elapsed_time / total_queries) * 1000 if total_queries else 0

    hit_1_rate = (hit_1_count / total_queries) * 100 if total_queries else 0
    hit_4_rate = (hit_4_count / total_queries) * 100 if total_queries else 0
    mrr = sum(reciprocal_ranks) / total_queries if total_queries else 0
    avg_pos_dist = sum(distances) / len(distances) if distances else 0.0

    print("=" * 80)
    print(" EMPIRICAL RETRIEVAL BENCHMARK RESULTS")
    print("=" * 80)
    print(f"Total Evaluation Queries : {total_queries}")
    print(f"Hit@1 Accuracy           : {hit_1_rate:.1f}% ({hit_1_count}/{total_queries})")
    print(f"Hit@4 Accuracy           : {hit_4_rate:.1f}% ({hit_4_count}/{total_queries})")
    print(f"Mean Reciprocal Rank(MRR): {mrr:.3f}")
    print(f"Mean Top-1 Cosine Dist   : {avg_pos_dist:.3f} (Lower = More Similar, Space: [0.0, 2.0])")
    print(f"Avg Query Latency        : {avg_latency_ms:.1f} ms / query")
    print("=" * 80 + "\n")
    return 0

if __name__ == "__main__":
    default_dataset = Path(__file__).resolve().parent / "eval_dataset.json"
    custom_dataset = Path(sys.argv[1]) if len(sys.argv) > 1 else default_dataset
    sys.exit(run_retrieval_eval(custom_dataset))
