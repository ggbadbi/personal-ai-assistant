# backend/sync_scheduler.py
import os
import sys
import json
from datetime import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from dotenv import load_dotenv

load_dotenv()

_scheduler = None
_sync_status = {
    "gmail": {"last_sync": None, "status": "never", "chunks_added": 0, "error": None},
    "notion": {"last_sync": None, "status": "never", "chunks_added": 0, "error": None},
    "next_sync": None,
    "auto_sync_enabled": False,
    "interval_hours": 6
}


def sync_gmail():
    """Auto-sync Gmail in background."""
    print(f"\n[AUTO-SYNC] Gmail starting at {datetime.now().strftime('%H:%M:%S')}...")
    _sync_status["gmail"]["status"] = "syncing"
    try:
        from ingestion.gmail_connector import ingest_gmail
        from backend.vector_store import add_chunks
        from backend.analytics import log_ingestion

        chunks, email_count = ingest_gmail(max_emails=50, days_back=1)
        added = add_chunks(chunks)
        log_ingestion("Gmail Auto-Sync", "email", added, "email")

        _sync_status["gmail"]["status"] = "ok"
        _sync_status["gmail"]["last_sync"] = datetime.now().isoformat()
        _sync_status["gmail"]["chunks_added"] = added
        _sync_status["gmail"]["error"] = None
        print(f"[AUTO-SYNC] Gmail done: {email_count} emails, {added} new chunks")
    except Exception as e:
        _sync_status["gmail"]["status"] = "error"
        _sync_status["gmail"]["error"] = str(e)
        print(f"[AUTO-SYNC] Gmail error: {e}")


def sync_notion():
    """Auto-sync Notion in background."""
    print(f"\n[AUTO-SYNC] Notion starting at {datetime.now().strftime('%H:%M:%S')}...")
    _sync_status["notion"]["status"] = "syncing"
    try:
        token = os.getenv("NOTION_TOKEN")
        if not token:
            _sync_status["notion"]["status"] = "skipped"
            _sync_status["notion"]["error"] = "NOTION_TOKEN not set"
            return

        from ingestion.notion_connector import ingest_notion
        from backend.vector_store import add_chunks
        from backend.analytics import log_ingestion

        chunks, page_count, db_count = ingest_notion()
        added = add_chunks(chunks)
        log_ingestion("Notion Auto-Sync", "notion", added, "notion")

        _sync_status["notion"]["status"] = "ok"
        _sync_status["notion"]["last_sync"] = datetime.now().isoformat()
        _sync_status["notion"]["chunks_added"] = added
        _sync_status["notion"]["error"] = None
        print(f"[AUTO-SYNC] Notion done: {page_count} pages, {added} new chunks")
    except Exception as e:
        _sync_status["notion"]["status"] = "error"
        _sync_status["notion"]["error"] = str(e)
        print(f"[AUTO-SYNC] Notion error: {e}")


def sync_all():
    """Run all syncs."""
    print(f"\n[AUTO-SYNC] Running full sync at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sync_gmail()
    sync_notion()
    # Update next sync time
    from datetime import timedelta
    _sync_status["next_sync"] = (
        datetime.now() + timedelta(hours=_sync_status["interval_hours"])
    ).isoformat()
    print(f"[AUTO-SYNC] Full sync complete. Next: {_sync_status['next_sync']}")


def start_scheduler(interval_hours: int = 6):
    """Start the background scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        sync_all,
        trigger=IntervalTrigger(hours=interval_hours),
        id="auto_sync",
        name="Auto Sync Gmail + Notion",
        replace_existing=True
    )
    _scheduler.start()
    _sync_status["auto_sync_enabled"] = True
    _sync_status["interval_hours"] = interval_hours

    from datetime import timedelta
    _sync_status["next_sync"] = (
        datetime.now() + timedelta(hours=interval_hours)
    ).isoformat()

    print(f"[AUTO-SYNC] Scheduler started. Syncing every {interval_hours} hours.")
    print(f"[AUTO-SYNC] Next sync: {_sync_status['next_sync']}")


def stop_scheduler():
    """Stop the background scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
        _sync_status["auto_sync_enabled"] = False
        print("[AUTO-SYNC] Scheduler stopped.")


def get_sync_status() -> dict:
    return _sync_status.copy()


def trigger_manual_sync():
    """Trigger an immediate sync manually."""
    import threading
    thread = threading.Thread(target=sync_all, daemon=True)
    thread.start()
    return {"message": "Manual sync started in background"}