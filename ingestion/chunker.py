# ingestion/chunker.py
import hashlib
from typing import List
from dataclasses import dataclass, field


@dataclass
class Chunk:
    text: str
    metadata: dict = field(default_factory=dict)
    chunk_id: str = ""

    def __post_init__(self):
        if not self.chunk_id:
            self.chunk_id = hashlib.md5(self.text.encode()).hexdigest()


def chunk_text(text: str, metadata: dict, chunk_size: int = 1000, overlap: int = 200) -> List[Chunk]:
    """Split text into overlapping chunks with metadata."""
    if not text or not text.strip():
        return []

    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunk_text_str = " ".join(chunk_words)

        if len(chunk_text_str.strip()) < 50:
            break

        chunk_meta = {**metadata, "chunk_index": len(chunks)}
        chunks.append(Chunk(text=chunk_text_str, metadata=chunk_meta))

        start += chunk_size - overlap

    return chunks