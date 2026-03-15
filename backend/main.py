import os
import sys
import uuid
import time
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
from backend.analytics import log_query, log_ingestion, get_stats
from ingestion.youtube_loader import ingest_youtube
from ingestion.gmail_connector import ingest_gmail
from backend.digest import generate_digest
from backend.study import generate_flashcards, generate_quiz, generate_summary_notes

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

    start = time.time()
    result = chat(request.message, request.session_id)
    elapsed_ms = int((time.time() - start) * 1000)

    log_query(
        query=request.message,
        answer=result.get("answer", ""),
        sources_count=result.get("chunks_used", 0),
        session_id=request.session_id,
        response_time_ms=elapsed_ms
    )

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

        # Log ingestion to analytics
        log_ingestion(file.filename, ext.strip('.'), added, "file")

        # Summary — read raw text directly (bypasses dedup)
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
    log_ingestion(title, "url", added, "webpage")
    return {
        "status": "success",
        "url": url,
        "title": title,
        "chunks_added": added
    }


@app.post("/ingest/youtube")
def ingest_youtube_endpoint(payload: dict):
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL required")

    print(f"YouTube ingest: {url}")
    chunks, title = ingest_youtube(url)

    added = add_chunks(chunks)
    print(f"Added to DB: {added}")

    # Summary from first 5 chunks of transcript
    if chunks:
        transcript_sample = " ".join([c.text for c in chunks[:5]])
        summary = summarize_document(transcript_sample, title)
    else:
        summary = "• No transcript available for this video."

    log_ingestion(title, "youtube", added, "youtube")

    return {
        "status": "success" if added > 0 else "no_transcript",
        "url": url,
        "title": title,
        "chunks_added": added,
        "summary": summary
    }

@app.post("/ingest/gmail")
def ingest_gmail_endpoint(payload: dict = {}):
    """Ingest emails from Gmail."""
    max_emails = payload.get("max_emails", 100)
    days_back = payload.get("days_back", 30)

    try:
        chunks, email_count = ingest_gmail(
            max_emails=max_emails,
            days_back=days_back
        )
        added = add_chunks(chunks)
        log_ingestion("Gmail", "email", added, "email")

        return {
            "status": "success",
            "emails_fetched": email_count,
            "chunks_added": added
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ingest/gmail/status")
def gmail_status():
    """Check if Gmail is connected."""
    import os
    return {
        "credentials_found": os.path.exists("credentials.json"),
        "token_found": os.path.exists("token.json"),
        "connected": os.path.exists("token.json")
    }

@app.post("/ingest/reupload")
async def reupload_source(source_name: str, file: UploadFile = File(...)):
    """Delete old source and re-ingest with new file."""
    try:
        # Delete old chunks
        deleted = delete_source(source_name)
        print(f"Deleted {deleted} old chunks for: {source_name}")

        # Save new file
        ext = os.path.splitext(file.filename)[1].lower()
        save_path = os.path.join(UPLOAD_DIR, file.filename)
        contents = await file.read()
        with open(save_path, "wb") as f:
            f.write(contents)

        # Clear dedup hash for this file so it re-ingests
        import json
        hash_file = "./data/processed/seen_hashes.json"
        if os.path.exists(hash_file):
            with open(hash_file, 'r') as hf:
                hashes = set(json.load(hf))
            # We can't easily remove specific hashes so just clear all
            os.remove(hash_file)

        chunks = load_file(save_path)
        added = add_chunks(chunks)
        log_ingestion(file.filename, ext.strip('.'), added, "file")

        try:
            with open(save_path, 'r', encoding='utf-8', errors='ignore') as rf:
                raw_text = rf.read()
            summary = summarize_document(raw_text, file.filename)
        except:
            summary = "• Summary unavailable."

        return {
            "status": "success",
            "old_source": source_name,
            "filename": file.filename,
            "old_chunks_deleted": deleted,
            "new_chunks_added": added,
            "summary": summary
        }
    except Exception as e:
        import traceback
        print(f"REUPLOAD ERROR:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics")
def analytics():
    return get_stats()


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

@app.get("/digest")
def daily_digest():
    """Generate today's knowledge digest."""
    result = generate_digest()
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result

@app.post("/study/flashcards")
def flashcards_endpoint(payload: dict = {}):
    topic = payload.get("topic", None)
    count = payload.get("count", 5)
    cards = generate_flashcards(topic=topic, count=count)
    if not cards:
        raise HTTPException(status_code=404, detail="Could not generate flashcards. Make sure you have documents ingested.")
    return {"cards": cards, "count": len(cards), "topic": topic}


@app.post("/study/quiz")
def quiz_endpoint(payload: dict = {}):
    topic = payload.get("topic", None)
    count = payload.get("count", 5)
    questions = generate_quiz(topic=topic, count=count)
    if not questions:
        raise HTTPException(status_code=404, detail="Could not generate quiz questions.")
    return {"questions": questions, "count": len(questions), "topic": topic}


@app.post("/study/notes")
def notes_endpoint(payload: dict = {}):
    source = payload.get("source", None)
    notes = generate_summary_notes(source_name=source)
    return {"notes": notes, "source": source}