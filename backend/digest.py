# backend/digest.py
# Generates a daily morning digest from your knowledge base

import os
import sys
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.vector_store import search, total_count
from backend.llm import ask, is_ollama_running
from backend.analytics import _get_conn


def get_recent_ingestions(days: int = 1) -> list:
    """Get documents ingested in the last N days."""
    conn = _get_conn()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    rows = conn.execute(
        "SELECT filename, filetype, chunks_added, source_type, timestamp FROM ingestions WHERE timestamp > ? ORDER BY timestamp DESC",
        (cutoff,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_queries(days: int = 1) -> list:
    """Get queries from last N days."""
    conn = _get_conn()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    rows = conn.execute(
        "SELECT query, timestamp, sources_used FROM queries WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 20",
        (cutoff,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def generate_digest() -> dict:
    """Generate a comprehensive daily digest."""
    if not is_ollama_running():
        return {"error": "Ollama is not running"}

    if total_count() == 0:
        return {"error": "No documents in knowledge base yet"}

    today = datetime.now().strftime('%A, %B %d %Y')
    recent_docs = get_recent_ingestions(days=1)
    recent_queries = get_recent_queries(days=1)

    # Search for broad knowledge themes
    themes = [
        "key concepts and main ideas",
        "important facts and information",
        "action items and tasks",
        "recent news and updates"
    ]

    all_chunks = []
    seen = set()
    for theme in themes:
        chunks = search(theme, k=5)
        for c in chunks:
            key = c['text'][:40]
            if key not in seen:
                all_chunks.append(c)
                seen.add(key)

    context = "\n\n---\n\n".join([
        f"[{c['metadata'].get('source', 'Unknown')}]\n{c['text']}"
        for c in all_chunks[:15]
    ])

    # Build digest prompt
    recent_docs_text = "\n".join([f"- {d['filename']} ({d['source_type']})" for d in recent_docs]) or "None today"
    recent_queries_text = "\n".join([f"- {q['query'][:60]}" for q in recent_queries[:5]]) or "None today"

    prompt = f"""Today is {today}. Generate a morning knowledge digest.

RECENTLY ADDED TO KNOWLEDGE BASE:
{recent_docs_text}

RECENT QUESTIONS ASKED:
{recent_queries_text}

Based on the knowledge base content above, create a digest with these sections:

## 🌅 Good Morning — {today}

## 📚 Knowledge Highlights
3-4 interesting facts or insights from the knowledge base

## 🔥 What You've Been Learning
Based on recent queries and ingested content

## 💡 Did You Know?
One surprising or interesting fact from the knowledge base

## 📋 Suggested Questions to Ask Today
3 questions worth exploring based on your knowledge base

Keep it concise, engaging, and useful. Use the actual content from the knowledge base."""

    answer = ask(prompt=prompt, context=context, history=[])

    return {
        "date": today,
        "digest": answer,
        "stats": {
            "total_chunks": total_count(),
            "new_docs_today": len(recent_docs),
            "queries_today": len(recent_queries),
            "recent_docs": recent_docs,
            "recent_queries": recent_queries
        }
    }