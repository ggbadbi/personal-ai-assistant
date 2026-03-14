# ingestion/file_loader.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from ingestion.chunker import chunk_text, Chunk
from ingestion.deduplicator import filter_new
from typing import List


def _meta(filepath: str, filetype: str) -> dict:
    fname = os.path.basename(filepath)
    return {
        "source": fname,
        "filepath": filepath,
        "type": filetype,
        "date_ingested": datetime.now().isoformat()
    }


def load_txt(filepath: str) -> List[Chunk]:
    print(f"   Loading TXT: {filepath}")
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    chunks = chunk_text(text, _meta(filepath, "txt"))
    return filter_new(chunks)


def load_md(filepath: str) -> List[Chunk]:
    print(f"   Loading MD: {filepath}")
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
    chunks = chunk_text(text, _meta(filepath, "markdown"))
    return filter_new(chunks)


def load_pdf(filepath: str) -> List[Chunk]:
    print(f"   Loading PDF: {filepath}")
    try:
        import pypdf
        reader = pypdf.PdfReader(filepath)
        text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            text += f"\n[Page {i+1}]\n{page_text}"
        chunks = chunk_text(text, _meta(filepath, "pdf"))
        return filter_new(chunks)
    except Exception as e:
        print(f"   ❌ PDF error: {e}")
        return []


def load_docx(filepath: str) -> List[Chunk]:
    print(f"   Loading DOCX: {filepath}")
    try:
        from docx import Document
        doc = Document(filepath)
        text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        chunks = chunk_text(text, _meta(filepath, "docx"))
        return filter_new(chunks)
    except Exception as e:
        print(f"   ❌ DOCX error: {e}")
        return []


def load_file(filepath: str) -> List[Chunk]:
    """Auto-detect file type and load."""
    ext = os.path.splitext(filepath)[1].lower()
    loaders = {
        ".txt": load_txt,
        ".md":  load_md,
        ".pdf": load_pdf,
        ".docx": load_docx,
    }
    loader = loaders.get(ext)
    if loader:
        return loader(filepath)
    else:
        print(f"   ⚠ Unsupported file type: {ext}")
        return []


def load_folder(folder_path: str) -> List[Chunk]:
    """Load all supported files from a folder recursively."""
    all_chunks = []
    supported = {".txt", ".md", ".pdf", ".docx"}

    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in supported:
                full_path = os.path.join(root, filename)
                chunks = load_file(full_path)
                all_chunks.extend(chunks)
                print(f"   ✅ {filename}: {len(chunks)} chunks")

    return all_chunks