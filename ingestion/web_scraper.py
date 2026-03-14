# ingestion/web_scraper.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from bs4 import BeautifulSoup
from datetime import datetime
from ingestion.chunker import chunk_text
from ingestion.deduplicator import filter_new
from typing import List, Tuple


def scrape_url(url: str) -> Tuple[str, str]:
    """Fetch a URL and extract clean text + title."""
    headers = {"User-Agent": "Mozilla/5.0 (compatible; PersonalAI/1.0)"}
    response = httpx.get(url, headers=headers, timeout=15.0, follow_redirects=True)
    soup = BeautifulSoup(response.text, "html.parser")

    # Remove junk elements
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "ads"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title else url

    # Try to get main content
    main = soup.find("main") or soup.find("article") or soup.find("div", {"id": "content"}) or soup.body
    text = main.get_text(separator="\n", strip=True) if main else ""

    # Clean up blank lines
    lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 30]
    clean_text = "\n".join(lines)

    return clean_text, title


def ingest_url(url: str):
    """Scrape a URL and return chunks ready for vector store."""
    print(f"   Scraping: {url}")
    try:
        text, title = scrape_url(url)
        if not text:
            print(f"   ⚠ No content extracted from {url}")
            return [], title

        meta = {
            "source": title,
            "url": url,
            "type": "webpage",
            "date_ingested": datetime.now().isoformat()
        }
        chunks = chunk_text(text, meta)
        new_chunks = filter_new(chunks)
        print(f"   ✅ '{title}': {len(new_chunks)} chunks")
        return new_chunks, title
    except Exception as e:
        print(f"   ❌ Scrape error: {e}")
        return [], url