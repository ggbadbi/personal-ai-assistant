import os
import sys
import uuid
import time
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.security import (
    verify_password, create_session, verify_session,
    revoke_session, log_event, get_audit_log,
    UI_PASSWORD_ENABLED, detect_pii
)
from fastapi import Request

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
from ingestion.notion_connector import ingest_notion
from backend.digest import generate_digest
from backend.study import generate_flashcards, generate_quiz, generate_summary_notes
from backend.knowledge_graph import build_graph_data
from backend.sync_scheduler import (
    start_scheduler, stop_scheduler,
    get_sync_status, trigger_manual_sync
)

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


@app.on_event("startup")
async def startup_event():
    auto_sync = os.getenv("AUTO_SYNC_ENABLED", "true").lower() == "true"
    interval = int(os.getenv("AUTO_SYNC_INTERVAL_HOURS", "6"))
    if auto_sync:
        start_scheduler(interval_hours=interval)
    log_event("SERVER_START", f"Server started. Auto-sync: {auto_sync}")
    print(f"Server started. Auto-sync: {auto_sync}, every {interval}h")


@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()


# ── Health ──────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        ollama=is_ollama_running(),
        vector_db=True,
        total_documents=total_count()
    )

@app.get("/")
def root():
    return {"message": "Personal AI Assistant API is running"}

# ── Security / Auth ──────────────────────────────────────────────────────────

@app.post("/auth/login")
def login(payload: dict, request: Request):
    password = payload.get("password", "")
    if verify_password(password):
        token = create_session()
        log_event("LOGIN_SUCCESS", "User logged in",
                  ip_address=request.client.host, session_token=token)
        return {"success": True, "token": token}
    else:
        log_event("LOGIN_FAILED", "Wrong password attempt",
                  ip_address=request.client.host)
        raise HTTPException(status_code=401, detail="Wrong password")


@app.post("/auth/logout")
def logout(payload: dict):
    token = payload.get("token", "")
    revoke_session(token)
    log_event("LOGOUT", "User logged out", session_token=token)
    return {"success": True}


@app.get("/auth/status")
def auth_status():
    return {
        "password_enabled": UI_PASSWORD_ENABLED,
        "requires_login": UI_PASSWORD_ENABLED
    }


@app.get("/audit/log")
def audit_log():
    return {"events": get_audit_log(limit=100)}


# ── Chat ─────────────────────────────────────────────────────────────────────

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


# ── Ingest ───────────────────────────────────────────────────────────────────

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

        chunks = load_file(save_path)
        added = add_chunks(chunks)
        log_ingestion(file.filename, ext.strip('.'), added, "file")

        try:
            with open(save_path, 'r', encoding='utf-8', errors='ignore') as rf:
                raw_text = rf.read()
            summary = summarize_document(raw_text, file.filename)
        except Exception as sum_err:
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
    return {"status": "success", "url": url, "title": title, "chunks_added": added}


@app.post("/ingest/youtube")
def ingest_youtube_endpoint(payload: dict):
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL required")
    chunks, title = ingest_youtube(url)
    added = add_chunks(chunks)
    if chunks:
        summary = summarize_document(" ".join([c.text for c in chunks[:5]]), title)
    else:
        summary = "• No transcript available for this video."
    log_ingestion(title, "youtube", added, "youtube")
    return {
        "status": "success" if added > 0 else "no_transcript",
        "url": url, "title": title,
        "chunks_added": added, "summary": summary
    }


@app.post("/ingest/gmail")
def ingest_gmail_endpoint(payload: dict = {}):
    max_emails = payload.get("max_emails", 100)
    days_back = payload.get("days_back", 30)
    try:
        chunks, email_count = ingest_gmail(max_emails=max_emails, days_back=days_back)
        added = add_chunks(chunks)
        log_ingestion("Gmail", "email", added, "email")
        return {"status": "success", "emails_fetched": email_count, "chunks_added": added}
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ingest/gmail/status")
def gmail_status():
    return {
        "credentials_found": os.path.exists("credentials.json"),
        "token_found": os.path.exists("token.json"),
        "connected": os.path.exists("token.json")
    }


@app.post("/ingest/notion")
def ingest_notion_endpoint(payload: dict = {}):
    page_id = payload.get("page_id", None)
    try:
        chunks, page_count, db_count = ingest_notion(specific_page_id=page_id)
        added = add_chunks(chunks)
        log_ingestion("Notion", "notion", added, "notion")
        return {
            "status": "success",
            "pages_ingested": page_count,
            "databases_ingested": db_count,
            "chunks_added": added
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ingest/notion/status")
def notion_status():
    token = os.getenv("NOTION_TOKEN")
    return {"connected": bool(token), "token_set": bool(token)}


@app.post("/ingest/reupload")
async def reupload_source(source_name: str, file: UploadFile = File(...)):
    try:
        deleted = delete_source(source_name)
        ext = os.path.splitext(file.filename)[1].lower()
        save_path = os.path.join(UPLOAD_DIR, file.filename)
        contents = await file.read()
        with open(save_path, "wb") as f:
            f.write(contents)

        import json
        hash_file = "./data/processed/seen_hashes.json"
        if os.path.exists(hash_file):
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


# ── Sync ─────────────────────────────────────────────────────────────────────

@app.get("/sync/status")
def sync_status():
    return get_sync_status()


@app.post("/sync/trigger")
def manual_sync():
    return trigger_manual_sync()


@app.post("/sync/start")
def start_sync(payload: dict = {}):
    hours = payload.get("interval_hours", 6)
    start_scheduler(interval_hours=hours)
    return {"status": "started", "interval_hours": hours}


@app.post("/sync/stop")
def stop_sync():
    stop_scheduler()
    return {"status": "stopped"}


# ── Analytics ────────────────────────────────────────────────────────────────

@app.get("/analytics")
def analytics():
    return get_stats()


# ── Knowledge Graph ──────────────────────────────────────────────────────────

@app.get("/knowledge-graph")
def knowledge_graph():
    try:
        return build_graph_data()
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ── Sources ──────────────────────────────────────────────────────────────────

@app.get("/sources")
def list_sources():
    return {"sources": get_all_sources()}


@app.delete("/sources/{source_name}")
def remove_source(source_name: str):
    deleted = delete_source(source_name)
    return {"status": "deleted", "chunks_removed": deleted}


# ── Digest ───────────────────────────────────────────────────────────────────

@app.get("/digest")
def daily_digest():
    result = generate_digest()
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


# ── Study ─────────────────────────────────────────────────────────────────────

@app.post("/study/flashcards")
def flashcards_endpoint(payload: dict = {}):
    cards = generate_flashcards(topic=payload.get("topic"), count=payload.get("count", 5))
    if not cards:
        raise HTTPException(status_code=404, detail="Could not generate flashcards.")
    return {"cards": cards, "count": len(cards), "topic": payload.get("topic")}


@app.post("/study/quiz")
def quiz_endpoint(payload: dict = {}):
    questions = generate_quiz(topic=payload.get("topic"), count=payload.get("count", 5))
    if not questions:
        raise HTTPException(status_code=404, detail="Could not generate quiz questions.")
    return {"questions": questions, "count": len(questions), "topic": payload.get("topic")}


@app.post("/study/notes")
def notes_endpoint(payload: dict = {}):
    notes = generate_summary_notes(source_name=payload.get("source"))
    return {"notes": notes, "source": payload.get("source")}