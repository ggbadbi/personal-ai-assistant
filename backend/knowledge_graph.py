# backend/knowledge_graph.py
import os
import sys
import json
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.vector_store import get_all_sources, search
from backend.llm import ask


def extract_entities(text: str, source_name: str) -> list:
    """Extract key entities/topics from a text chunk using Llama."""
    prompt = f"""Extract 5-8 key topics, concepts, skills, or named entities from this text.
Include: technologies, skills, companies, concepts, subject areas, people, tools.
Return ONLY a JSON array of short strings (1-3 words each). No other text.
Example: ["python", "data analysis", "machine learning", "sql", "career growth"]

Text: {text[:1500]}"""

    result = ask(prompt=prompt, context="", history=[])
    try:
        match = re.search(r'\[[\s\S]*?\]', result)
        if match:
            entities = json.loads(match.group())
            return [e.lower().strip() for e in entities if isinstance(e, str) and len(e) > 2]
    except:
        pass
    return []


def build_graph_data() -> dict:
    """Build a knowledge graph from the vector store."""
    sources = get_all_sources()
    if not sources:
        return {"nodes": [], "edges": [], "stats": {"sources": 0, "topics": 0, "connections": 0}}

    print(f"Building knowledge graph for {len(sources)} sources...")

    nodes = []
    edges = []
    entity_to_sources = {}
    source_entities = {}

    type_config = {
        "pdf":      {"color": "#ef4444", "icon": "📕"},
        "docx":     {"color": "#3b82f6", "icon": "📘"},
        "txt":      {"color": "#06b6d4", "icon": "📄"},
        "markdown": {"color": "#10b981", "icon": "📝"},
        "email":    {"color": "#f59e0b", "icon": "📧"},
        "youtube":  {"color": "#ec4899", "icon": "📺"},
        "webpage":  {"color": "#8b5cf6", "icon": "🌐"},
        "notion":   {"color": "#a78bfa", "icon": "📓"},
    }

    # Add all source nodes
    for src in sources:
        cfg = type_config.get(src["type"], {"color": "#00d4e0", "icon": "📄"})
        nodes.append({
            "id": src["name"],
            "label": src["name"][:35] + ("..." if len(src["name"]) > 35 else ""),
            "full_label": src["name"],
            "type": src["type"],
            "color": cfg["color"],
            "icon": cfg["icon"],
            "chunk_count": src.get("chunk_count", 0),
            "date": src.get("date_ingested", "")[:10],
            "node_type": "source",
            "size": min(20 + src.get("chunk_count", 1) * 0.5, 40)
        })

    # Extract entities from each source
    print("Extracting entities from sources...")
    for src in sources[:30]:
        try:
            chunks = search(src["name"][:30], k=4)
            source_chunks = [c for c in chunks if src["name"][:15].lower() in c["metadata"].get("source", "").lower()]
            if not source_chunks:
                source_chunks = chunks[:2]

            combined_text = " ".join([c["text"][:600] for c in source_chunks[:2]])
            if not combined_text.strip():
                continue

            entities = extract_entities(combined_text, src["name"])
            source_entities[src["name"]] = entities
            print(f"  {src['name'][:25]}: {entities[:4]}")

            for entity in entities:
                if entity not in entity_to_sources:
                    entity_to_sources[entity] = []
                entity_to_sources[entity].append(src["name"])

        except Exception as e:
            print(f"  Error: {src['name'][:20]}: {e}")
            continue

    # Topic nodes for entities shared by 2+ sources
    shared_entities = {e: srcs for e, srcs in entity_to_sources.items() if len(srcs) >= 2}
    print(f"Shared topics found: {len(shared_entities)}")

    for entity, srcs in list(shared_entities.items())[:40]:
        nodes.append({
            "id": f"topic:{entity}",
            "label": entity,
            "full_label": entity,
            "type": "topic",
            "color": "#00d4e0",
            "icon": "🏷",
            "node_type": "topic",
            "size": 8 + len(srcs) * 3,
            "connected_sources": len(srcs)
        })
        for src_name in srcs:
            edges.append({
                "source": f"topic:{entity}",
                "target": src_name,
                "type": "topic_connection",
                "strength": 1
            })

    # Direct edges between sources sharing 2+ topics
    source_names = list(source_entities.keys())
    for i in range(len(source_names)):
        for j in range(i + 1, len(source_names)):
            src_a = source_names[i]
            src_b = source_names[j]
            shared = set(source_entities.get(src_a, [])) & set(source_entities.get(src_b, []))
            if len(shared) >= 2:
                edges.append({
                    "source": src_a,
                    "target": src_b,
                    "type": "direct_connection",
                    "strength": len(shared),
                    "shared_topics": list(shared)[:5]
                })

    print(f"Graph: {len(nodes)} nodes, {len(edges)} edges")

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "sources": len(sources),
            "topics": len(shared_entities),
            "connections": len(edges)
        }
    }