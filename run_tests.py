"""
ContextVault Unified Test Runner
Runs:
1. RAG Engine Unit Tests (test_rag_engine.py) - Chunking, loaders, embeddings, query structure
2. API Endpoints Integration Tests (test_api_endpoints.py) - Health check, document listing, security validation, chat queries, deletion
"""

import sys
import os
import unittest
import time
from pathlib import Path

# Force offline embeddings & extractive LLM fallback for fast, isolated automated testing
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["LLM_PROVIDER"] = "extractive"

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(BACKEND_DIR / "tests"))

from test_rag_engine import TestRAGEngine
from test_api_endpoints import TestAPIEndpoints

def main():
    print("\n" + "=" * 70, flush=True)
    print(" [TEST SUITE] CONTEXTVAULT AUTOMATED SOFTWARE VERIFICATION", flush=True)
    print("=" * 70 + "\n", flush=True)

    suite = unittest.TestSuite()
    loader = unittest.TestLoader()

    suite.addTests(loader.loadTestsFromTestCase(TestRAGEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestAPIEndpoints))

    total_tests = suite.countTestCases()
    print(f"Discovered {total_tests} test cases across RAG Engine & REST API.\n", flush=True)

    t0 = time.time()
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    elapsed = time.time() - t0

    print("\n" + "=" * 70, flush=True)
    print(" [SUMMARY] SOFTWARE TESTING RESULTS", flush=True)
    print("=" * 70, flush=True)
    print(f"Total Tests Run : {result.testsRun}", flush=True)
    print(f"Passed          : {result.testsRun - len(result.failures) - len(result.errors)}", flush=True)
    print(f"Failed          : {len(result.failures)}", flush=True)
    print(f"Errors          : {len(result.errors)}", flush=True)
    print(f"Total Execution : {elapsed:.2f} seconds", flush=True)
    print("-" * 70, flush=True)

    if result.wasSuccessful():
        print(f"\nVerification successful: {result.testsRun} tests passed in {elapsed:.2f}s.\n", flush=True)
        return 0
    else:
        print(f"\nVerification failed: {len(result.failures)} failures, {len(result.errors)} errors.\n", flush=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())
