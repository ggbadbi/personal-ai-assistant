import httpx
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:14b")
FAST_MODEL = os.getenv("FAST_MODEL", "llama3.2:latest")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")


def ask(prompt: str, context: str, history: list = [],
        use_fast: bool = False) -> str:
    """
    Smart model routing:
    - Short queries → fast model (llama3.2:3b)
    - Complex reasoning → deepseek-r1:14b
    """
    model = FAST_MODEL if use_fast else OLLAMA_MODEL

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

    # DeepSeek-R1 uses thinking tokens — strip <think> blocks from output
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.05,
                    "num_predict": 1000,
                    "num_ctx": 4096
                }
            },
            timeout=180.0  # longer timeout for 14b model
        )
        result = response.json()
        content = result["message"]["content"]

        # Strip DeepSeek thinking blocks <think>...</think>
        import re
        content = re.sub(r'<think>[\s\S]*?</think>', '', content).strip()

        return content
    except Exception as e:
        return f"LLM Error: {str(e)}"


def ask_fast(prompt: str, context: str) -> str:
    """Use fast small model for simple tasks."""
    return ask(prompt, context, use_fast=True)


def get_embedding(text: str) -> list:
    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=30.0
        )
        data = response.json()
        if "embedding" in data:
            return data["embedding"]
        elif "embeddings" in data:
            return data["embeddings"][0]
        else:
            print(f"Embedding error: unexpected keys: {list(data.keys())}")
            return []
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
    """Use fast model for summaries."""
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
                "model": FAST_MODEL,  # use fast model for summaries
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 300}
            },
            timeout=60.0
        )
        return response.json()["response"]
    except Exception as e:
        return f"• Summary unavailable: {e}"
