# backend/study.py
import os
import sys
import json
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.vector_store import search
from backend.llm import ask


def _extract_json(text: str) -> list:
    """Robustly extract JSON array from LLM response that may have extra text."""
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except:
        pass
    # Find JSON array anywhere in text using regex
    match = re.search(r'\[[\s\S]*?\](?=\s*$|\s*\n)', text)
    if not match:
        match = re.search(r'\[[\s\S]*\]', text)
    if match:
        try:
            return json.loads(match.group())
        except:
            pass
    # Try code blocks
    for marker in ['```json', '```']:
        if marker in text:
            try:
                extracted = text.split(marker)[1].split('```')[0].strip()
                return json.loads(extracted)
            except:
                pass
    print(f"Could not extract JSON from: {text[:300]}")
    return []


def generate_flashcards(topic: str = None, count: int = 5) -> list:
    query = topic if topic else "key concepts facts definitions"
    chunks = search(query, k=15)
    if not chunks:
        return []

    context = "\n\n---\n\n".join([
        f"[{c['metadata'].get('source', 'Unknown')}]\n{c['text']}"
        for c in chunks
    ])

    prompt = f"""Generate exactly {count} flashcards from the knowledge base content.
{"Topic: " + topic if topic else "Use the most important concepts."}

IMPORTANT: Return ONLY the JSON array below. No introduction, no explanation, no text before or after.

[
  {{
    "front": "What is X?",
    "back": "X is...",
    "source": "document name",
    "difficulty": "easy"
  }}
]

Difficulty must be: easy, medium, or hard.
Generate exactly {count} items."""

    result = ask(prompt=prompt, context=context, history=[])
    cards = _extract_json(result)
    print(f"Flashcards generated: {len(cards)}")
    return cards if isinstance(cards, list) else []


def generate_quiz(topic: str = None, count: int = 5) -> list:
    query = topic if topic else "important facts concepts"
    chunks = search(query, k=15)
    if not chunks:
        return []

    context = "\n\n---\n\n".join([
        f"[{c['metadata'].get('source', 'Unknown')}]\n{c['text']}"
        for c in chunks
    ])

    prompt = f"""Generate exactly {count} multiple choice questions from the knowledge base.
{"Topic: " + topic if topic else "Cover the main concepts."}

IMPORTANT: Return ONLY the JSON array. No text before or after the array.

[
  {{
    "question": "What does X mean?",
    "options": ["A) correct answer", "B) wrong answer", "C) wrong answer", "D) wrong answer"],
    "correct": 0,
    "explanation": "Because the content says...",
    "source": "document name"
  }}
]

correct = index of right answer (0, 1, 2, or 3).
Generate exactly {count} questions."""

    result = ask(prompt=prompt, context=context, history=[])
    questions = _extract_json(result)
    print(f"Quiz questions generated: {len(questions)}")
    return questions if isinstance(questions, list) else []


def generate_summary_notes(source_name: str = None) -> str:
    query = f"key points from {source_name}" if source_name else "main topics and concepts"
    chunks = search(query, k=20)

    if source_name:
        filtered = [c for c in chunks if source_name.lower()[:15] in c['metadata'].get('source', '').lower()[:15]]
        if filtered:
            chunks = filtered

    context = "\n\n---\n\n".join([c['text'] for c in chunks[:12]])

    prompt = f"""Create structured study notes from this content.

Format exactly like this:

# 📖 Study Notes{f': {source_name}' if source_name else ''}

## Key Concepts
- main idea 1
- main idea 2

## Important Facts
- fact 1
- fact 2

## Summary
2-3 sentences summarizing the content.

## Review Questions
1. Question one?
2. Question two?
3. Question three?

Use ONLY the provided content."""

    return ask(prompt=prompt, context=context, history=[])