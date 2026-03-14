# backend/session.py
# Stores conversation history per session in memory

sessions: dict = {}

MAX_HISTORY = 10  # keep last 10 turns


def get_history(session_id: str) -> list:
    return sessions.get(session_id, [])


def add_to_history(session_id: str, user_msg: str, assistant_msg: str):
    if session_id not in sessions:
        sessions[session_id] = []
    
    sessions[session_id].append({"role": "user", "content": user_msg})
    sessions[session_id].append({"role": "assistant", "content": assistant_msg})
    
    # Keep only last MAX_HISTORY turns
    if len(sessions[session_id]) > MAX_HISTORY * 2:
        sessions[session_id] = sessions[session_id][-(MAX_HISTORY * 2):]


def clear_history(session_id: str):
    if session_id in sessions:
        del sessions[session_id]


def list_sessions() -> list:
    return list(sessions.keys())