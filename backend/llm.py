import httpx
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")


def ask(prompt: str, context: str, history: list = []) -> str:
    messages = []

    for turn in history[:-2] if len(history) > 2 else []:
        messages.append({"role": turn["role"], "content": turn["content"]})

    user_message = f"""You are analyzing the user's personal knowledge base which contains documents, notes, and video transcripts in multiple languages including English, Hindi, Sindhi (Devanagari), and Punjabi (Gurmukhi script).

KNOWLEDGE BASE CONTENT:
===
{context}
===

CONVERSATION TASK: {prompt}

STRICT RULES:
1. Answer ONLY from the content above — never from general knowledge
2. Recognize text in ALL scripts: Latin (English), Devanagari (Hindi/Sindhi), Gurmukhi (Punjabi)
3. For songs/lyrics: identify saint names (Jhulelal, Lal Shahbaz, Guru Nanak, etc), religious terms, and community references
4. Sindhi cultural markers: Jhulelal, Sindhu river, Cheti Chand, Sufi terms in Devanagari
5. Punjabi cultural markers: Waheguru, Gurbani terms, Gurmukhi script references
6. Count exact occurrences when asked "how many times" — scan ALL provided chunks carefully
7. Quote EXACT text from the transcript as evidence with timestamp if available
8. If the question mentions a specific song or video by name — answer EXCLUSIVELY from that source only
9. Do NOT mix information from different sources unless explicitly asked to compare
10. If genuinely not found after thorough search: say "Not found in the transcript"
11. For follow-up questions like "in the whole song" or "how many times" — re-scan every chunk provided"""

    messages.append({"role": "user", "content": user_message})

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.05,
                    "num_predict": 1000
                }
            },
            timeout=120.0
        )
        result = response.json()
        return result["message"]["content"]
    except Exception as e:
        return f"LLM Error: {str(e)}"


def get_embedding(text: str) -> list:
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=30.0
        )
        return response.json()["embedding"]
    except Exception as e:
        print(f"Embedding error: {e}")
        return []


def is_ollama_running() -> bool:
    try:
        httpx.get(f"{OLLAMA_URL}/api/tags", timeout=3.0)
        return True
    except:
        return False


def summarize_document(text: str, filename: str) -> str:
    truncated = text[:4000].strip()
    prompt = f"""Read this document and write exactly 3 bullet points summarizing the key information.

Document: {filename}
Content: {truncated}

Write exactly 3 bullet points starting with •
Do not write anything else before or after the bullet points."""

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 300}
            },
            timeout=60.0
        )
        return response.json()["response"]
    except Exception as e:
        return f"• Summary unavailable: {e}"
