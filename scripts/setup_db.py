# scripts/setup_db.py
# Run this once to initialize ChromaDB
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import chromadb
from dotenv import load_dotenv

load_dotenv()

CHROMA_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")

def setup():
    print("Setting up ChromaDB...")
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    
    collection = client.get_or_create_collection(
        name="knowledge_base",
        metadata={"hnsw:space": "cosine"}
    )
    
    print(f"✅ ChromaDB initialized at: {CHROMA_PATH}")
    print(f"✅ Collection 'knowledge_base' ready")
    print(f"   Current documents: {collection.count()}")

if __name__ == "__main__":
    setup()