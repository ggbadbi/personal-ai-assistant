# scripts/ingest_all.py
# Drop files into data/raw/ and run this to ingest everything
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.file_loader import load_folder
from backend.vector_store import add_chunks, total_count
from dotenv import load_dotenv

load_dotenv()

RAW_FOLDER = os.getenv("DATA_RAW_PATH", "./data/raw")

if __name__ == "__main__":
    print("=" * 50)
    print("INGESTING ALL FILES FROM data/raw/")
    print("=" * 50)

    chunks = load_folder(RAW_FOLDER)
    print(f"\nTotal chunks to add: {len(chunks)}")

    added = add_chunks(chunks)
    print(f"✅ Added {added} chunks to vector store")
    print(f"   Total in DB: {total_count()}")
    print("=" * 50)