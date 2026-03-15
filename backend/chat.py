# backend/chat.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.llm import ask
from backend.vector_store import search
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


def split_questions(message: str) -> list:
    import re
    questions = re.split(r'\?\s+(?=[A-Z])', message)
    questions = [q.strip() + ('?' if not q.strip().endswith('?') else '') for q in questions if q.strip()]
    return questions if len(questions) > 1 else [message]


def build_sources(chunks: list) -> list:
    sources = []
    for c in chunks:
        meta = c["metadata"]
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


def chat(message: str, session_id: str = "default") -> dict:
    questions = split_questions(message)
    history = get_history(session_id)

    if len(questions) == 1:
        chunks = search(message, k=10)
        context = build_context(chunks)
        answer = ask(prompt=message, context=context, history=history)
        sources = build_sources(chunks)
    else:
        all_chunks = []
        seen_ids = set()
        for q in questions:
            for c in search(q, k=6):
                cid = c["text"][:50]
                if cid not in seen_ids:
                    all_chunks.append(c)
                    seen_ids.add(cid)

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
        "chunks_used": len(sources)
    }