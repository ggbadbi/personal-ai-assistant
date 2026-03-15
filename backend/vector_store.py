# backend/vector_store.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import chromadb
from dotenv import load_dotenv
from backend.llm import get_embedding
from ingestion.chunker import Chunk
from typing import List

load_dotenv()

CHROMA_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")

_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _client.get_or_create_collection(
            name="knowledge_base",
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def add_chunks(chunks: List[Chunk]) -> int:
    """Embed and store chunks in ChromaDB. Returns count added."""
    if not chunks:
        return 0

    collection = _get_collection()
    added = 0

    for chunk in chunks:
        try:
            embedding = get_embedding(chunk.text)
            if not embedding:
                continue

            collection.add(
                ids=[chunk.chunk_id],
                embeddings=[embedding],
                documents=[chunk.text],
                metadatas=[chunk.metadata]
            )
            added += 1
        except Exception as e:
            if "already exists" in str(e).lower():
                pass  # duplicate, skip silently
            else:
                print(f"   ⚠ Add chunk error: {e}")

    return added


def search(query: str, k: int = 6) -> List[dict]:
    collection = _get_collection()
    if collection.count() == 0:
        return []

    query_embedding = get_embedding(query)
    if not query_embedding:
        return []

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(k, collection.count()),
        include=["documents", "metadatas", "distances"]
    )

    chunks = []
    for i in range(len(results["documents"][0])):
        meta = results["metadatas"][0][i]
        chunks.append({
            "text": results["documents"][0][i],
            "metadata": meta,
            "score": round(1 - results["distances"][0][i], 4),
            "timestamp": meta.get("timestamp", None),
            "timestamp_url": meta.get("timestamp_url", None)
        })

    return chunks


def get_all_sources() -> List[dict]:
    """List all unique sources ingested."""
    collection = _get_collection()
    if collection.count() == 0:
        return []

    results = collection.get(include=["metadatas"])
    seen = {}

    for meta in results["metadatas"]:
        source = meta.get("source", "unknown")
        if source not in seen:
            seen[source] = {
                "name": source,
                "type": meta.get("type", "unknown"),
                "date_ingested": meta.get("date_ingested", ""),
                "chunk_count": 1
            }
        else:
            seen[source]["chunk_count"] += 1

    return list(seen.values())


def delete_source(source_name: str) -> int:
    """Delete all chunks from a specific source."""
    collection = _get_collection()
    results = collection.get(
        where={"source": source_name},
        include=["metadatas"]
    )
    ids = results["ids"]
    if ids:
        collection.delete(ids=ids)
    return len(ids)


def total_count() -> int:
    return _get_collection().count()