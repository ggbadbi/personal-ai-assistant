# backend/main.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import shutil
import uuid

from backend.models import ChatRequest, ChatResponse, HealthResponse
from backend.chat import chat
from backend.vector_store import add_chunks, get_all_sources, delete_source, total_count
from backend.llm import is_ollama_running
from ingestion.file_loader import load_file
from ingestion.web_scraper import ingest_url
from ingestion.chunker import chunk_text

load_dotenv()

app = FastAPI(title="Personal AI Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
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
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".txt", ".md", ".pdf", ".docx"]:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    chunks = load_file(save_path)
    added = add_chunks(chunks)

    return {
        "status": "success",
        "filename": file.filename,
        "chunks_added": added,
        "doc_id": str(uuid.uuid4())
    }


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