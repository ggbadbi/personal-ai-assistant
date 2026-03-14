# backend/chat.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.llm import ask
from backend.vector_store import search
from backend.session import get_history, add_to_history


def build_context(chunks: list) -> str:
    """Format retrieved chunks into a readable context block."""
    if not chunks:
        return "No relevant information found in your knowledge base."

    parts = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        source = meta.get("source", "Unknown")
        doc_type = meta.get("type", "")
        score = chunk.get("score", 0)
        parts.append(
            f"[Source {i}: {source} ({doc_type}) | Relevance: {score}]\n{chunk['text']}"
        )
    return "\n\n---\n\n".join(parts)


def chat(message: str, session_id: str = "default") -> dict:
    """Main chat function: retrieve → build context → ask LLM → return answer + sources."""

    # 1. Retrieve relevant chunks from vector store
    chunks = search(message, k=6)

    # 2. Build context string
    context = build_context(chunks)

    # 3. Get conversation history
    history = get_history(session_id)

    # 4. Ask the LLM
    answer = ask(
        prompt=message,
        context=context,
        history=history
    )

    # 5. Save to history
    add_to_history(session_id, message, answer)

    # 6. Build sources list for frontend
    sources = []
    for chunk in chunks:
        meta = chunk["metadata"]
        sources.append({
            "source": meta.get("source", "Unknown"),
            "type": meta.get("type", "unknown"),
            "score": chunk.get("score", 0),
            "snippet": chunk["text"][:200] + "..."
        })

    return {
        "answer": answer,
        "sources": sources,
        "session_id": session_id,
        "chunks_used": len(chunks)
    }