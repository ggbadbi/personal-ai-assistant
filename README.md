<div align="center">

# 🧠 Neural Knowledge Base
### Personal AI Assistant — 100% Local, 100% Free, 100% Private

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Ollama](https://img.shields.io/badge/Ollama-DeepSeek--R1_14B-black?style=flat)](https://ollama.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6B6B?style=flat)](https://trychroma.com)
[![License](https://img.shields.io/badge/License-MIT-00D4E0?style=flat)](LICENSE)

**Ingest your emails, notes, YouTube videos, and documents. Then ask anything.**  
Powered by DeepSeek-R1 14B running locally on your GPU. No API keys. No subscriptions. No data leaves your machine.

[Features](#-features) • [Architecture](#-architecture) • [Setup](#-quick-start) • [Usage](#-usage) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

### 🔍 Knowledge Ingestion
| Source | Details |
|--------|---------|
| 📄 **Files** | PDF, DOCX, TXT, Markdown |
| 📧 **Gmail** | OAuth2, read-only, auto-dedup |
| 📓 **Notion** | Pages, databases, recursive blocks |
| 📺 **YouTube** | Auto captions + Whisper GPU fallback |
| 🌐 **Web URLs** | BeautifulSoup scraper, clean extraction |

### 💬 Intelligent Chat
- **RAG pipeline** — retrieves relevant chunks before answering
- **Source citations** — every answer shows exactly which document it came from
- **Timestamp links** — YouTube answers link directly to the exact moment in the video
- **Multi-language** — English, Hindi, Sindhi (Devanagari), Punjabi (Gurmukhi)
- **Conversation history** — follow-up questions work naturally
- **Edit messages** — hover any message to edit and resend
- **Pin answers** — save important responses
- **Export to PDF** — download your entire chat

### 🎓 Study Mode
- **Flashcards** — AI generates Q&A cards from your documents
- **Quiz** — Multiple choice questions with explanations
- **Study Notes** — Structured notes with key concepts
- **Daily Digest** — Morning summary of your knowledge base

### 📊 Analytics & Visualization
- **Knowledge Graph** — D3 force-directed map of how your documents connect
- **Analytics Dashboard** — Query history, topic leaderboard, response times
- **Source breakdown** — Donut chart of content types

### 🔄 Auto-Sync
- Background scheduler syncs Gmail + Notion every 6 hours
- Zero-click — new emails appear automatically
- Deduplication ensures nothing is indexed twice

### 🔒 Security
- Password-protected UI with session tokens
- Audit log of all events (logins, ingestions, queries)
- All data stored locally — nothing sent to cloud

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NEURAL KNOWLEDGE BASE                    │
├──────────────┬──────────────────────────┬───────────────────┤
│   SOURCES    │      INGESTION PIPELINE   │   VECTOR STORE    │
│              │                          │                   │
│  📧 Gmail    │  Chunker (1000 words)    │  ChromaDB         │
│  📓 Notion   │  Deduplicator (MD5)      │  nomic-embed-text │
│  📺 YouTube  │  Whisper Fallback        │  cosine similarity│
│  📄 Files    │  Auto-Summary (LLM)      │  persistent disk  │
│  🌐 URLs     │                          │                   │
├──────────────┴──────────────────────────┴───────────────────┤
│                        RAG ENGINE                            │
│                                                              │
│  User Query → Embed → Search Top-K → Build Context → LLM   │
│                                                              │
│  DeepSeek-R1 14B  (reasoning)  ←→  llama3.2 (fast tasks)  │
├─────────────────────────────────────────────────────────────┤
│                    REACT FRONTEND                            │
│                                                              │
│  Chat UI  │  Knowledge Graph (D3)  │  Analytics  │  Study   │
│  Upload   │  Sources Panel         │  Sync       │  Audit   │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites
- Windows 10/11 (tested on Alienware M16 R1)
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com/download/windows)
- 8GB+ RAM (12GB+ VRAM recommended for 14B model)

### 1. Clone & Setup

```bash
git clone https://github.com/ggbadbi/personal-ai-assistant.git
cd personal-ai-assistant
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install AI Models

```bash
ollama pull llama3.1          # Main chat model
ollama pull deepseek-r1:14b   # Reasoning model (recommended)
ollama pull nomic-embed-text  # Embeddings
```

### 3. Configure

Copy `.env.example` to `.env` and fill in:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:14b
FAST_MODEL=llama3.2:latest
OLLAMA_EMBED_MODEL=nomic-embed-text
CHROMA_DB_PATH=./chroma_db
DATA_RAW_PATH=./data/raw
AUTO_SYNC_ENABLED=true
AUTO_SYNC_INTERVAL_HOURS=6
UI_PASSWORD_ENABLED=false
UI_PASSWORD=your_password_here
```

### 4. Initialize Database

```bash
python scripts/setup_db.py
```

### 5. Start Everything

**Double-click `start.bat`** or run manually:

```bash
# Terminal 1
ollama serve

# Terminal 2
uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0

# Terminal 3
cd frontend && npm install && npm run dev
```

Open **http://localhost:5173** 🚀

---

## 📖 Usage

### Ingesting Your Knowledge

| Tab | What to do |
|-----|-----------|
| 📄 File | Drag and drop PDF, DOCX, TXT, or MD files |
| 🌐 URL | Paste any web article URL |
| 📺 YouTube | Paste YouTube link — captions fetched automatically |
| 📧 Gmail | Click Connect (requires `credentials.json` from Google Cloud) |
| 📓 Notion | Paste your Notion integration token in `.env` |

### Chatting with Your Knowledge

```
Ask anything about your documents:

"What job opportunities are in my emails?"
"Summarize the key concepts from my Python course"
"What did the AI newsletter say about GPT-5?"
"In the Lal Shahbaz song, how many times is Jhulelal mentioned?"
"What are my goals according to my Notion notes?"
```

### Study Mode

1. Click **🎓 Study** tab
2. Enter a topic (optional)
3. Choose: Flashcards, Quiz, Study Notes, or Daily Digest

### Knowledge Graph

1. Click **🕸 Graph** tab
2. Click **Open Knowledge Graph**
3. Click **Build Graph** (takes ~60 seconds)
4. Drag nodes, scroll to zoom, click to inspect

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | REST API server |
| **ChromaDB** | Vector database for semantic search |
| **LangChain** | Document loading and chunking |
| **Ollama** | Local LLM inference |
| **DeepSeek-R1 14B** | Primary reasoning model |
| **nomic-embed-text** | Text embeddings |
| **faster-whisper** | Audio transcription fallback |
| **APScheduler** | Background auto-sync |
| **SQLite** | Analytics and audit database |
| **Google Gmail API** | Email ingestion |
| **Notion API** | Notes sync |
| **yt-dlp** | YouTube audio download |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool |
| **D3.js** | Knowledge graph visualization |
| **Recharts** | Analytics charts |
| **react-markdown** | Markdown rendering |
| **jsPDF** | PDF export |
| **Axios** | HTTP client |

---

## 📁 Project Structure

```
personal-ai-assistant/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── chat.py              # RAG logic + source targeting
│   ├── vector_store.py      # ChromaDB operations
│   ├── llm.py               # Ollama (DeepSeek-R1 + llama3.2)
│   ├── analytics.py         # Query/ingestion tracking
│   ├── knowledge_graph.py   # Entity extraction + graph
│   ├── sync_scheduler.py    # Auto-sync engine
│   ├── security.py          # Auth, sessions, audit log
│   ├── digest.py            # Daily knowledge digest
│   └── study.py             # Flashcards, quiz, notes
├── ingestion/
│   ├── file_loader.py       # PDF, DOCX, TXT, MD
│   ├── gmail_connector.py   # Gmail OAuth2
│   ├── notion_connector.py  # Notion API
│   ├── youtube_loader.py    # Captions + Whisper
│   ├── web_scraper.py       # URL ingestion
│   ├── chunker.py           # Text splitting
│   └── deduplicator.py      # MD5 hash dedup
├── frontend/src/
│   ├── components/
│   │   ├── ChatWindow.jsx   # Main chat UI
│   │   ├── MessageBubble.jsx
│   │   ├── Sidebar.jsx      # 7-tab panel
│   │   ├── FileUpload.jsx   # 5-source ingest
│   │   ├── KnowledgeBase.jsx
│   │   ├── KnowledgeGraph.jsx # D3 force graph
│   │   ├── Analytics.jsx    # Recharts dashboard
│   │   ├── StudyMode.jsx    # Flashcards + Quiz
│   │   ├── SyncStatus.jsx   # Auto-sync control
│   │   ├── AuditLog.jsx     # Security events
│   │   └── LoginScreen.jsx  # Password gate
│   ├── hooks/useChat.js
│   └── api/client.js
├── scripts/
│   ├── setup_db.py
│   ├── ingest_all.py
│   └── test_llm.py
├── start.bat                # One-click launcher
├── stop.bat                 # Kill all services
├── .env.example
└── requirements.txt
```

---

## 🔒 Privacy & Security

- **100% Local** — All AI inference runs on your GPU via Ollama
- **No telemetry** — Nothing is sent to any external server
- **Encrypted sessions** — UI protected with password + session tokens
- **Audit log** — Every access, login, and ingestion is logged
- **Gmail read-only** — OAuth2 scope never allows sending or modifying
- **Git-safe** — `.env`, `chroma_db/`, and `data/` are gitignored

---

## 🚀 Performance (Alienware M16 R1)

| Task | Speed |
|------|-------|
| Chat response (DeepSeek-R1 14B) | ~15-25 sec |
| Embedding generation | ~0.1 sec/chunk |
| PDF ingestion (100 pages) | ~30 sec |
| YouTube transcript fetch | ~3 sec |
| Knowledge graph build (20 sources) | ~60 sec |
| Auto-sync (50 emails) | ~25 sec |

---

## 🤝 Contributing

This is a personal project but PRs are welcome! Areas for improvement:
- Additional ingestion sources (Slack, Obsidian, WhatsApp)
- Streaming chat responses
- Better multilingual embedding models
- iOS/Android companion app

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by Bhavika Gurbani**  
*From zero to production AI system in one conversation*

[⭐ Star this repo](https://github.com/ggbadbi/personal-ai-assistant) • [🐛 Report Bug](https://github.com/ggbadbi/personal-ai-assistant/issues)

</div>