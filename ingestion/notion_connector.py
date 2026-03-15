# ingestion/notion_connector.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from ingestion.chunker import chunk_text
from ingestion.deduplicator import filter_new
from dotenv import load_dotenv

load_dotenv()

NOTION_TOKEN = os.getenv("NOTION_TOKEN")


def get_client():
    from notion_client import Client
    if not NOTION_TOKEN:
        raise ValueError("NOTION_TOKEN not set in .env file")
    return Client(auth=NOTION_TOKEN)


def extract_text_from_block(block: dict) -> str:
    """Extract plain text from any Notion block type."""
    block_type = block.get("type", "")
    content = block.get(block_type, {})

    # Blocks with rich_text
    if "rich_text" in content:
        return " ".join([rt.get("plain_text", "") for rt in content["rich_text"]])

    # Special blocks
    if block_type == "child_database":
        return f"[Database: {content.get('title', '')}]"
    if block_type == "image":
        caption = content.get("caption", [])
        return "[Image: " + " ".join([c.get("plain_text", "") for c in caption]) + "]"
    if block_type == "code":
        code_text = " ".join([rt.get("plain_text", "") for rt in content.get("rich_text", [])])
        lang = content.get("language", "")
        return f"[Code ({lang}): {code_text}]"
    if block_type == "equation":
        return f"[Equation: {content.get('expression', '')}]"
    if block_type == "divider":
        return "---"
    if block_type == "callout":
        texts = " ".join([rt.get("plain_text", "") for rt in content.get("rich_text", [])])
        icon = content.get("icon", {}).get("emoji", "")
        return f"{icon} {texts}".strip()
    if block_type == "toggle":
        return " ".join([rt.get("plain_text", "") for rt in content.get("rich_text", [])])
    if block_type == "to_do":
        checked = "✅" if content.get("checked") else "☐"
        text = " ".join([rt.get("plain_text", "") for rt in content.get("rich_text", [])])
        return f"{checked} {text}"
    if block_type == "table_row":
        cells = content.get("cells", [])
        return " | ".join([" ".join([rt.get("plain_text", "") for rt in cell]) for cell in cells])

    return ""


def get_page_blocks(client, block_id: str, depth: int = 0) -> str:
    """Recursively get all text from a page's blocks."""
    if depth > 3:  # limit recursion depth
        return ""

    text_parts = []
    try:
        blocks = client.blocks.children.list(block_id=block_id, page_size=100)
        for block in blocks.get("results", []):
            text = extract_text_from_block(block)
            if text.strip():
                text_parts.append(text)
            # Recurse into children
            if block.get("has_children") and depth < 2:
                child_text = get_page_blocks(client, block["id"], depth + 1)
                if child_text:
                    text_parts.append(child_text)
    except Exception as e:
        print(f"   ⚠ Block fetch error: {e}")

    return "\n".join(text_parts)


def get_page_title(page: dict) -> str:
    """Extract title from any Notion page format."""
    props = page.get("properties", {})
    
    # Try all common title property names
    for key in ["title", "Title", "Name", "name", "Page", "page"]:
        if key in props:
            prop = props[key]
            ptype = prop.get("type", "")
            if ptype == "title":
                texts = prop.get("title", [])
                t = " ".join([x.get("plain_text", "") for x in texts])
                if t.strip():
                    return t.strip()

    # Try ANY property that is type "title"
    for key, prop in props.items():
        if prop.get("type") == "title":
            texts = prop.get("title", [])
            t = " ".join([x.get("plain_text", "") for x in texts])
            if t.strip():
                return t.strip()

    # Try page object's own title (for child_page blocks)
    if page.get("object") == "page":
        child_page = page.get("properties", {})
        # Some pages store title directly
        if "title" in page:
            items = page["title"]
            if isinstance(items, list):
                t = " ".join([x.get("plain_text", "") for x in items])
                if t.strip():
                    return t.strip()

    # Fall back to page ID last 8 chars
    return f"Page-{page.get('id', 'unknown')[-8:]}"


def fetch_all_pages(client) -> list:
    """Search for all pages accessible to the integration."""
    pages = []
    try:
        # Search for all pages
        response = client.search(
            filter={"property": "object", "value": "page"},
            page_size=100
        )
        pages.extend(response.get("results", []))

        # Handle pagination
        while response.get("has_more"):
            response = client.search(
                filter={"property": "object", "value": "page"},
                start_cursor=response.get("next_cursor"),
                page_size=100
            )
            pages.extend(response.get("results", []))

    except Exception as e:
        print(f"   ⚠ Search error: {e}")

    return pages


def fetch_databases(client) -> list:
    """Fetch all accessible databases."""
    try:
        response = client.search(
            filter={"property": "object", "value": "database"},
            page_size=100
        )
        return response.get("results", [])
    except Exception as e:
        # Try without filter for older API versions
        try:
            response = client.search(page_size=100)
            return [r for r in response.get("results", []) if r.get("object") == "database"]
        except Exception as e2:
            print(f"   ⚠ Database fetch error: {e2}")
            return []



def ingest_database_entries(client, database_id: str, db_title: str) -> list:
    """Fetch all entries from a Notion database."""
    chunks = []
    try:
        response = client.databases.query(database_id=database_id, page_size=100)
        entries = response.get("results", [])

        while response.get("has_more"):
            response = client.databases.query(
                database_id=database_id,
                start_cursor=response.get("next_cursor"),
                page_size=100
            )
            entries.extend(response.get("results", []))

        print(f"   📋 Database '{db_title}': {len(entries)} entries")

        for entry in entries:
            title = get_page_title(entry)
            # Get page content
            content = get_page_blocks(client, entry["id"])

            # Also extract all properties as text
            props_text = []
            for prop_name, prop_val in entry.get("properties", {}).items():
                ptype = prop_val.get("type", "")
                if ptype == "rich_text":
                    text = " ".join([rt.get("plain_text", "") for rt in prop_val.get("rich_text", [])])
                    if text:
                        props_text.append(f"{prop_name}: {text}")
                elif ptype == "select":
                    sel = prop_val.get("select")
                    if sel:
                        props_text.append(f"{prop_name}: {sel.get('name', '')}")
                elif ptype == "multi_select":
                    items = [s.get("name", "") for s in prop_val.get("multi_select", [])]
                    if items:
                        props_text.append(f"{prop_name}: {', '.join(items)}")
                elif ptype == "date":
                    date = prop_val.get("date")
                    if date:
                        props_text.append(f"{prop_name}: {date.get('start', '')}")
                elif ptype == "checkbox":
                    props_text.append(f"{prop_name}: {'Yes' if prop_val.get('checkbox') else 'No'}")
                elif ptype == "number":
                    num = prop_val.get("number")
                    if num is not None:
                        props_text.append(f"{prop_name}: {num}")
                elif ptype == "url":
                    url = prop_val.get("url")
                    if url:
                        props_text.append(f"{prop_name}: {url}")

            full_text = f"Title: {title}\n"
            if props_text:
                full_text += "\n".join(props_text) + "\n"
            if content:
                full_text += f"\n{content}"

            if len(full_text.strip()) < 30:
                continue

            meta = {
                "source": f"Notion: {db_title} / {title}",
                "type": "notion",
                "notion_type": "database_entry",
                "database": db_title,
                "page_title": title,
                "page_id": entry["id"],
                "date_ingested": datetime.now().isoformat()
            }
            page_chunks = chunk_text(full_text, meta, chunk_size=500, overlap=50)
            chunks.extend(page_chunks)

    except Exception as e:
        print(f"   ⚠ Database query error: {e}")

    return chunks


def ingest_notion(specific_page_id: str = None) -> tuple:
    """Main function — ingest all Notion pages and databases."""
    print("   📓 Connecting to Notion...")
    client = get_client()

    all_chunks = []
    page_count = 0
    db_count = 0

    if specific_page_id:
        # Ingest specific page only
        try:
            page = client.pages.retrieve(page_id=specific_page_id)
            title = get_page_title(page)
            content = get_page_blocks(client, specific_page_id)
            if content:
                meta = {
                    "source": f"Notion: {title}",
                    "type": "notion",
                    "notion_type": "page",
                    "page_title": title,
                    "page_id": specific_page_id,
                    "date_ingested": datetime.now().isoformat()
                }
                chunks = chunk_text(content, meta, chunk_size=500, overlap=50)
                all_chunks.extend(chunks)
                page_count = 1
                print(f"   ✅ Page '{title}': {len(chunks)} chunks")
        except Exception as e:
            print(f"   ❌ Page fetch error: {e}")
    else:
        # Ingest all accessible pages
        print("   🔍 Searching for pages...")
        pages = fetch_all_pages(client)
        print(f"   📄 Found {len(pages)} pages")

        for page in pages:
            try:
                title = get_page_title(page)
                if not title:
                    title = f"Notion-Page-{page.get('id', '')[-8:]}"
                    continue

                content = get_page_blocks(client, page["id"])
                if not content or len(content.strip()) < 50:
                    continue

                meta = {
                    "source": f"Notion: {title}",
                    "type": "notion",
                    "notion_type": "page",
                    "page_title": title,
                    "page_id": page["id"],
                    "date_ingested": datetime.now().isoformat()
                }
                chunks = chunk_text(content, meta, chunk_size=500, overlap=50)
                new_chunks = filter_new(chunks)
                all_chunks.extend(new_chunks)
                page_count += 1
                print(f"   ✅ '{title}': {len(new_chunks)} chunks")

            except Exception as e:
                print(f"   ⚠ Page error: {e}")
                continue

        # Ingest databases
        print("   🔍 Searching for databases...")
        databases = fetch_databases(client)
        print(f"   📋 Found {len(databases)} databases")

        for db in databases:
            try:
                db_title = db.get("title", [{}])[0].get("plain_text", "Untitled DB")
                db_chunks = ingest_database_entries(client, db["id"], db_title)
                new_chunks = filter_new(db_chunks)
                all_chunks.extend(new_chunks)
                db_count += 1
            except Exception as e:
                print(f"   ⚠ DB error: {e}")
                continue

    print(f"   ✅ Notion: {page_count} pages + {db_count} databases → {len(all_chunks)} chunks")
    return all_chunks, page_count, db_count