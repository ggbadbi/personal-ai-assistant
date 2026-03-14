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
    
    system_prompt = f"""You are a personal knowledge assistant. 
You have access to the user's personal notes, emails, documents, and learning materials.

RULES:
- Answer ONLY using the provided context below
- Always mention which source the information came from
- If the answer is not in the context, say: "I couldn't find information about that in your knowledge base."
- Be concise and helpful
- Never make up information

CONTEXT FROM YOUR KNOWLEDGE BASE:
{context}
"""
    
    messages = []
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": prompt})

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "system": system_prompt,
                "messages": messages,
                "stream": False
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