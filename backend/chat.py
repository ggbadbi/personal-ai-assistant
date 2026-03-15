# backend/chat.py
import os
import sys
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.llm import ask
from backend.vector_store import search, get_all_sources
from backend.session import get_history, add_to_history


def build_context(chunks: list) -> str:
    if not chunks:
        return "No relevant information found in your knowledge base."
    parts = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        source = meta.get("source", "Unknown")
        doc_type = meta.get("type", "")
        score = chunk.get("score", 0)
        timestamp = meta.get("timestamp", "")
        ts_str = f" | Timestamp: {timestamp}" if timestamp else ""
        parts.append(
            f"[Source {i}: {source} ({doc_type}){ts_str} | Relevance: {score}]\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(parts)


def build_sources(chunks: list) -> list:
    sources = []
    seen = set()
    for c in chunks:
        meta = c["metadata"]
        key = meta.get("source", "Unknown") + str(c.get("score", 0))
        if key in seen:
            continue
        seen.add(key)
        entry = {
            "source": meta.get("source", "Unknown"),
            "type": meta.get("type", "unknown"),
            "score": c.get("score", 0),
            "snippet": c["text"][:200] + "..."
        }
        if meta.get("type") == "youtube":
            entry["timestamp"] = meta.get("timestamp", "")
            entry["timestamp_url"] = meta.get("timestamp_url", "")
            entry["channel"] = meta.get("channel", "")
        sources.append(entry)
    return sources


def detect_target_source(message: str) -> str | None:
    """
    Check if user is asking about a specific source by name.
    Returns partial source name if detected, None otherwise.
    """
    message_lower = message.lower()

    # Get all ingested sources
    try:
        all_sources = get_all_sources()
        source_names = [s["name"] for s in all_sources]
    except:
        return None

    # Check if any source name words appear in the query
    for source_name in source_names:
        # Split source name into meaningful words (3+ chars)
        words = [w.lower() for w in re.split(r'[\s\-_|]+', source_name) if len(w) > 3]
        # If 2+ words from source name appear in query — it's a match
        matches = sum(1 for w in words if w in message_lower)
        if matches >= 2 or (len(words) == 1 and matches == 1):
            return source_name

    return None


def filter_chunks_by_source(chunks: list, source_name: str) -> list:
    """Keep only chunks from the detected source."""
    filtered = [c for c in chunks if source_name.lower()[:20] in c["metadata"].get("source", "").lower()[:20]]
    return filtered if filtered else chunks  # fallback to all if filter too aggressive


def split_questions(message: str) -> list:
    questions = re.split(r'\?\s+(?=[A-Z])', message)
    questions = [q.strip() + ('?' if not q.strip().endswith('?') else '') for q in questions if q.strip()]
    return questions if len(questions) > 1 else [message]


def chat(message: str, session_id: str = "default") -> dict:
    questions = split_questions(message)
    history = get_history(session_id)

    # Detect if user is asking about a specific source
    target_source = detect_target_source(message)
    if target_source:
        print(f"   🎯 Detected target source: {target_source}")

    if len(questions) == 1:
        # Search with higher k when source-specific (need more chunks from that source)
        k = 15 if target_source else 8
        chunks = search(message, k=k)

        # Filter to target source if detected
        if target_source:
            chunks = filter_chunks_by_source(chunks, target_source)
            print(f"   📌 Filtered to {len(chunks)} chunks from target source")

        context = build_context(chunks)
        answer = ask(prompt=message, context=context, history=history)
        sources = build_sources(chunks)

    else:
        all_chunks = []
        seen_ids = set()

        for q in questions:
            k = 10 if target_source else 6
            for c in search(q, k=k):
                cid = c["text"][:50]
                if cid not in seen_ids:
                    all_chunks.append(c)
                    seen_ids.add(cid)

        if target_source:
            all_chunks = filter_chunks_by_source(all_chunks, target_source)

        context = build_context(all_chunks)
        numbered = "\n".join([f"{i+1}. {q}" for i, q in enumerate(questions)])
        combined_prompt = f"Please answer each of these questions separately using my documents:\n\n{numbered}"
        answer = ask(prompt=combined_prompt, context=context, history=history)
        sources = build_sources(all_chunks)

    add_to_history(session_id, message, answer)

    return {
        "answer": answer,
        "sources": sources,
        "session_id": session_id,
        "chunks_used": len(sources),
        "target_source": target_source
    }