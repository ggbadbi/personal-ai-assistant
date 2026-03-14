# backend/llm.py
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")


def ask(prompt: str, context: str, history: list = []) -> str:
    """Send a prompt + retrieved context to Ollama and get a response."""

    messages = []

    # Add history BEFORE the current message (but not the context injection)
    for turn in history[:-2] if len(history) > 2 else []:
        messages.append({"role": turn["role"], "content": turn["content"]})

    # Current message with context injected
    user_message = f"""Here is relevant content from my personal documents:

---DOCUMENTS---
{context}
---END DOCUMENTS---

Using the documents above, answer this: {prompt}

Rules:
- Answer directly from the documents
- If asked a follow-up, use both the documents AND our conversation history
- Never say you lack access to notes — the content is right above
- Be specific and cite what you found"""

    messages.append({"role": "user", "content": user_message})

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 800
                }
            },
            timeout=120.0
        )
        result = response.json()
        return result["message"]["content"]
    except Exception as e:
        return f"LLM Error: {str(e)}"

def get_embedding(text: str) -> list:
    """Convert text to a vector embedding using nomic-embed-text."""
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={
                "model": EMBED_MODEL,
                "prompt": text
            },
            timeout=30.0
        )
        return response.json()["embedding"]
    except Exception as e:
        print(f"Embedding error: {e}")
        return []


def is_ollama_running() -> bool:
    """Check if Ollama server is up."""
    try:
        httpx.get(f"{OLLAMA_URL}/api/tags", timeout=3.0)
        return True
    except:
        return False