# backend/security.py
import os
import sqlite3
import hashlib
import secrets
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

AUDIT_DB = "./data/audit.db"
UI_PASSWORD = os.getenv("UI_PASSWORD", "")
UI_PASSWORD_ENABLED = os.getenv("UI_PASSWORD_ENABLED", "false").lower() == "true"

# Active sessions — token -> expiry
_sessions: dict = {}


def _get_conn():
    os.makedirs("./data", exist_ok=True)
    conn = sqlite3.connect(AUDIT_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_audit_db():
    """Create audit tables."""
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            event_type TEXT NOT NULL,
            description TEXT,
            ip_address TEXT,
            session_token TEXT
        )
    """)
    conn.commit()
    conn.close()


def log_event(event_type: str, description: str,
              ip_address: str = "", session_token: str = ""):
    """Log a security event."""
    try:
        conn = _get_conn()
        conn.execute("""
            INSERT INTO audit_log (timestamp, event_type, description, ip_address, session_token)
            VALUES (?, ?, ?, ?, ?)
        """, (datetime.now().isoformat(), event_type, description, ip_address, session_token))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit log error: {e}")


def get_audit_log(limit: int = 50) -> list:
    """Get recent audit events."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT * FROM audit_log
        ORDER BY id DESC LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str) -> bool:
    if not UI_PASSWORD_ENABLED:
        return True
    if not UI_PASSWORD:
        return True
    return hash_password(password) == hash_password(UI_PASSWORD)


def create_session() -> str:
    """Create a new session token."""
    token = secrets.token_urlsafe(32)
    from datetime import timedelta
    _sessions[token] = datetime.now() + timedelta(hours=24)
    return token


def verify_session(token: str) -> bool:
    """Check if session token is valid."""
    if not UI_PASSWORD_ENABLED:
        return True
    if token not in _sessions:
        return False
    if datetime.now() > _sessions[token]:
        del _sessions[token]
        return False
    return True


def revoke_session(token: str):
    """Logout — remove session."""
    if token in _sessions:
        del _sessions[token]


def detect_pii(text: str) -> list:
    """Detect potential PII in text before indexing."""
    import re
    findings = []

    patterns = {
        "email":       r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "phone":       r'\b(\+91|0)?[6-9]\d{9}\b',
        "aadhar":      r'\b\d{4}\s?\d{4}\s?\d{4}\b',
        "pan":         r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b',
        "credit_card": r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
        "password":    r'(?i)(password|passwd|pwd)\s*[:=]\s*\S+',
    }

    for pii_type, pattern in patterns.items():
        matches = re.findall(pattern, text)
        if matches:
            findings.append({
                "type": pii_type,
                "count": len(matches),
                "sample": str(matches[0])[:20] + "..."
            })

    return findings


# Initialize on import
init_audit_db()