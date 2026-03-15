import os
import sys
import uuid
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.models import ChatRequest, ChatResponse, HealthResponse
from backend.chat import chat
from backend.vector_store import add_chunks, get_all_sources, delete_source, total_count
from backend.llm import is_ollama_running, summarize_document
from ingestion.file_loader import load_file
from ingestion.web_scraper import ingest_url

load_dotenv()

app = FastAPI(title="Personal AI Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.getenv("DATA_RAW_PATH", "./data/raw")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        ollama=is_ollama_running(),
        vector_db=True,
        total_documents=total_count()
    )


@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    if not is_ollama_running():
        raise HTTPException(status_code=503, detail="Ollama is not running")
    result = chat(request.message, request.session_id)
    return result


@app.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    try:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".txt", ".md", ".pdf", ".docx"]:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        save_path = os.path.join(UPLOAD_DIR, file.filename)

        contents = await file.read()
        with open(save_path, "wb") as f:
            f.write(contents)

        print(f"Saved: {save_path}")

        chunks = load_file(save_path)
        print(f"Chunks created: {len(chunks)}")

        added = add_chunks(chunks)
        print(f"Added to DB: {added}")

        # Read raw text for summary (bypasses dedup)
        try:
            with open(save_path, 'r', encoding='utf-8', errors='ignore') as rf:
                raw_text = rf.read()
            print(f"Summarizing {len(raw_text)} chars...")
            summary = summarize_document(raw_text, file.filename)
            print(f"Summary done: {summary[:60]}")
        except Exception as sum_err:
            print(f"Summary error: {sum_err}")
            summary = "• Summary unavailable."

        return {
            "status": "success",
            "filename": file.filename,
            "chunks_added": added,
            "summary": summary,
            "doc_id": str(uuid.uuid4())
        }
    except Exception as e:
        import traceback
        print(f"INGEST ERROR:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingest/url")
def ingest_url_endpoint(payload: dict):
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL required")
    chunks, title = ingest_url(url)
    added = add_chunks(chunks)
    return {
        "status": "success",
        "url": url,
        "title": title,
        "chunks_added": added
    }


@app.get("/sources")
def list_sources():
    return {"sources": get_all_sources()}


@app.delete("/sources/{source_name}")
def remove_source(source_name: str):
    deleted = delete_source(source_name)
    return {"status": "deleted", "chunks_removed": deleted}


@app.get("/")
def root():
    return {"message": "Personal AI Assistant API is running"}