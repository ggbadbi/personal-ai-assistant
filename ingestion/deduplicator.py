# ingestion/deduplicator.py
import hashlib
import json
import os

SEEN_HASHES_FILE = "./data/processed/seen_hashes.json"


def _load_hashes() -> set:
    if os.path.exists(SEEN_HASHES_FILE):
        with open(SEEN_HASHES_FILE, "r") as f:
            return set(json.load(f))
    return set()


def _save_hashes(hashes: set):
    os.makedirs(os.path.dirname(SEEN_HASHES_FILE), exist_ok=True)
    with open(SEEN_HASHES_FILE, "w") as f:
        json.dump(list(hashes), f)


def is_duplicate(text: str) -> bool:
    h = hashlib.md5(text.encode()).hexdigest()
    return h in _load_hashes()


def mark_seen(text: str):
    hashes = _load_hashes()
    hashes.add(hashlib.md5(text.encode()).hexdigest())
    _save_hashes(hashes)


def filter_new(chunks) -> list:
    """Return only chunks not seen before, and mark them as seen."""
    seen = _load_hashes()
    new_chunks = []
    new_hashes = set()

    for chunk in chunks:
        h = chunk.chunk_id
        if h not in seen:
            new_chunks.append(chunk)
            new_hashes.add(h)

    seen.update(new_hashes)
    _save_hashes(seen)
    print(f"   Dedup: {len(chunks)} chunks → {len(new_chunks)} new, {len(chunks)-len(new_chunks)} skipped")
    return new_chunkss