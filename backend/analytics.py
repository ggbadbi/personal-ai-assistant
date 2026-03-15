# backend/analytics.py
# Tracks queries, topics, and usage over time — stored in SQLite

import sqlite3
import os
import json
from datetime import datetime, timedelta
from collections import Counter

DB_PATH = "./data/analytics.db"


def _get_conn():
    os.makedirs("./data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_analytics():
    """Create tables if they don't exist."""
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            query TEXT NOT NULL,
            answer_length INTEGER,
            sources_used INTEGER,
            session_id TEXT,
            response_time_ms INTEGER
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ingestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            filename TEXT NOT NULL,
            filetype TEXT,
            chunks_added INTEGER,
            source_type TEXT
        )
    """)
    conn.commit()
    conn.close()


def log_query(query: str, answer: str, sources_count: int,
              session_id: str = "default", response_time_ms: int = 0):
    """Log a query to analytics DB."""
    try:
        conn = _get_conn()
        conn.execute("""
            INSERT INTO queries (timestamp, query, answer_length, sources_used, session_id, response_time_ms)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().isoformat(),
            query,
            len(answer),
            sources_count,
            session_id,
            response_time_ms
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Analytics log error: {e}")


def log_ingestion(filename: str, filetype: str, chunks: int, source_type: str = "file"):
    """Log a document ingestion."""
    try:
        conn = _get_conn()
        conn.execute("""
            INSERT INTO ingestions (timestamp, filename, filetype, chunks_added, source_type)
            VALUES (?, ?, ?, ?, ?)
        """, (datetime.now().isoformat(), filename, filetype, chunks, source_type))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Analytics ingestion log error: {e}")


def get_stats() -> dict:
    """Return full analytics stats for the dashboard."""
    conn = _get_conn()

    # Total queries
    total_queries = conn.execute("SELECT COUNT(*) as c FROM queries").fetchone()['c']

    # Queries today
    today = datetime.now().strftime('%Y-%m-%d')
    queries_today = conn.execute(
        "SELECT COUNT(*) as c FROM queries WHERE timestamp LIKE ?", (f"{today}%",)
    ).fetchone()['c']

    # Queries this week
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    queries_week = conn.execute(
        "SELECT COUNT(*) as c FROM queries WHERE timestamp > ?", (week_ago,)
    ).fetchone()['c']

    # Recent queries
    recent = conn.execute("""
        SELECT query, timestamp, sources_used, response_time_ms
        FROM queries ORDER BY id DESC LIMIT 20
    """).fetchall()

    # Queries per day (last 7 days)
    daily = conn.execute("""
        SELECT substr(timestamp, 1, 10) as day, COUNT(*) as count
        FROM queries
        WHERE timestamp > ?
        GROUP BY day ORDER BY day
    """, (week_ago,)).fetchall()

    # Most common words in queries (simple topic extraction)
    all_queries = conn.execute("SELECT query FROM queries").fetchall()
    words = []
    stopwords = {'what', 'how', 'why', 'when', 'where', 'who', 'is', 'are',
                 'the', 'a', 'an', 'my', 'in', 'of', 'to', 'do', 'i', 'me',
                 'about', 'can', 'you', 'tell', 'does', 'did', 'was', 'and',
                 'that', 'this', 'it', 'for', 'on', 'with', 'from', 'by'}
    for row in all_queries:
        for word in row['query'].lower().split():
            clean = word.strip('?.,!:;')
            if len(clean) > 3 and clean not in stopwords:
                words.append(clean)
    top_topics = Counter(words).most_common(10)

    # Ingestion stats
    total_docs = conn.execute("SELECT COUNT(*) as c FROM ingestions").fetchone()['c']
    by_type = conn.execute("""
        SELECT source_type, COUNT(*) as count, SUM(chunks_added) as chunks
        FROM ingestions GROUP BY source_type
    """).fetchall()

    conn.close()

    return {
        "total_queries": total_queries,
        "queries_today": queries_today,
        "queries_week": queries_week,
        "recent_queries": [dict(r) for r in recent],
        "daily_activity": [dict(r) for r in daily],
        "top_topics": [{"word": w, "count": c} for w, c in top_topics],
        "total_docs_ingested": total_docs,
        "by_source_type": [dict(r) for r in by_type]
    }


# Initialize on import
init_analytics()