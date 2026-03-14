# scripts/test_llm.py
import httpx
import json

OLLAMA_URL = "http://localhost:11434"

def test_connection():
    print("Checking Ollama connection...")
    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
        models = r.json()['models']
        print(f"✅ Ollama connected. Installed models:")
        for m in models:
            size_gb = m['size'] / 1e9
            print(f"   - {m['name']} ({size_gb:.1f} GB)")
        return True
    except Exception as e:
        print(f"❌ Cannot connect to Ollama: {e}")
        return False

def test_chat():
    print("\nTesting LLM chat...")
    try:
        r = httpx.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": "llama3.1",
                "system": "You are a helpful AI assistant. Answer concisely and accurately.",
                "prompt": "What is Retrieval Augmented Generation (RAG) in AI? Answer in 2 sentences.",
                "stream": False
            },
            timeout=60.0
        )
        result = r.json()
        print(f"✅ LLM Response:\n   {result['response']}")
        print(f"   Tokens generated: {result.get('eval_count', 'N/A')}")
    except Exception as e:
        print(f"❌ Chat test failed: {e}")

def test_embeddings():
    print("\nTesting embeddings model...")
    try:
        r = httpx.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={
                "model": "nomic-embed-text",
                "prompt": "This is a test sentence for embeddings."
            },
            timeout=30.0
        )
        result = r.json()
        if 'embedding' in result:
            emb = result['embedding']
            print(f"✅ Embeddings working!")
            print(f"   Vector dimensions: {len(emb)}")
            print(f"   Sample values: {[round(v, 4) for v in emb[:4]]}")
        else:
            print(f"❌ No embedding in response: {result}")
    except Exception as e:
        print(f"❌ Embeddings test failed: {e}")
        print("   Run: ollama pull nomic-embed-text")

def test_gpu():
    print("\nChecking GPU usage...")
    try:
        r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=5.0)
        print("   Run 'ollama ps' in another PowerShell window while a model is loaded")
        print("   Look for '100% GPU' in the PROCESSOR column")
        print("✅ GPU check: see instructions above")
    except Exception as e:
        print(f"❌ {e}")

if __name__ == "__main__":
    print("=" * 55)
    print("   PERSONAL AI ASSISTANT — SYSTEM CHECK")
    print("=" * 55)
    
    connected = test_connection()
    if connected:
        test_chat()
        test_embeddings()
        test_gpu()
    
    print("\n" + "=" * 55)
    print("   Done! Fix any ❌ before moving to Stage 2.")
    print("=" * 55)