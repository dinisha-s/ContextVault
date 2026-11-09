import unittest
import sys
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from rag_engine import (
    load_document_file,
    process_and_add_document,
    query_rag,
    get_indexed_documents,
    delete_document_by_name,
    DATA_DIR
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

class TestRAGEngine(unittest.TestCase):
    """
    Unit tests for ContextVault RAG Engine components:
    - Text chunking & boundary overlap
    - Multi-format document loading
    - Metadata extraction
    """

    def setUp(self):
        self.sample_docs_dir = DATA_DIR / "sample_documents"
        self.test_txt_path = self.sample_docs_dir / "rag_handbook.txt"
        self.test_md_path = self.sample_docs_dir / "system_architecture.md"

    def test_recursive_chunking_and_overlap(self):
        """
        Verify that RecursiveCharacterTextSplitter adheres to chunk_size=500
        and chunk_overlap=60 to prevent mid-sentence context clipping.
        """
        sample_text = (
            "Sentence one discusses distributed cache invalidation strategies in web architectures. "
            "Sentence two explains write-through vs write-behind database synchronization patterns. "
            "Sentence three details horizontal sharding using consistent hash rings for database partitioning. "
        ) * 15  # Total > 3000 chars

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=60,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = splitter.split_text(sample_text)

        self.assertGreater(len(chunks), 1, "Long text must be partitioned into multiple chunks.")
        for chunk in chunks:
            self.assertLessEqual(len(chunk), 500, "Each chunk must not exceed the 500-char boundary.")

        # Test overlap between adjacent chunks:
        # The end of chunk 0 should overlap with the beginning of chunk 1
        tail_chunk_0 = chunks[0][-40:]
        self.assertIn(
            tail_chunk_0,
            chunks[1],
            "Chunk 1 should share overlapping character sequence with Chunk 0."
        )

    def test_markdown_document_loader(self):
        """
        Verify that TextLoader correctly parses Markdown files with UTF-8 encoding.
        """
        if self.test_md_path.exists():
            docs = load_document_file(str(self.test_md_path), "system_architecture.md")
            self.assertGreater(len(docs), 0, "Markdown file must produce at least one document object.")
            self.assertIn("Caching", docs[0].page_content, "Loaded Markdown content must contain expected text.")

    def test_text_document_loader(self):
        """
        Verify that plain text documents are loaded correctly.
        """
        if self.test_txt_path.exists():
            docs = load_document_file(str(self.test_txt_path), "rag_handbook.txt")
            self.assertGreater(len(docs), 0, "Text file must produce at least one document object.")
            self.assertIn("Chunking", docs[0].page_content, "Loaded TXT content must contain expected text.")

    def test_metadata_structure_in_query_rag(self):
        """
        Verify query_rag returns a properly formatted response dictionary
        containing query, context, sources, and citations.
        """
        result = query_rag("What is caching?", top_k=2)
        self.assertIsInstance(result, dict)
        self.assertIn("query", result)
        self.assertIn("context", result)
        self.assertIn("sources", result)
        self.assertIn("citations", result)
        self.assertIsInstance(result["citations"], list)

if __name__ == "__main__":
    unittest.main()
