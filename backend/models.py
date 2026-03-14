# backend/models.py
from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict] = []
    session_id: str


class IngestFileResponse(BaseModel):
    status: str
    filename: str
    chunks_added: int
    doc_id: str


class IngestURLResponse(BaseModel):
    status: str
    url: str
    title: str
    chunks_added: int


class SourceItem(BaseModel):
    id: str
    name: str
    type: str
    date_ingested: str
    chunk_count: int


class HealthResponse(BaseModel):
    status: str
    ollama: bool
    vector_db: bool
    total_documents: int