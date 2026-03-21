# 🛠 Detailed Setup Guide

## Gmail Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → **personal-ai-assistant**
3. Enable **Gmail API**
4. Create **OAuth 2.0 Client ID** (Desktop app)
5. Download JSON → save as `credentials.json` in project root
6. Go to **Audience** → Add test user → add your Gmail
7. Run Gmail ingest → browser opens for auth → done

## Notion Setup

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Create integration → copy token
3. Add to `.env`: `NOTION_TOKEN=secret_xxx`
4. Open each Notion page → **...** → **Connections** → select integration
5. Click Sync in app

## GPU Whisper Setup (for videos without captions)

```bash
# Install CUDA 12 toolkit from NVIDIA website
# Then test:
python -c "from faster_whisper import WhisperModel; print('OK')"
```

Change in `ingestion/youtube_loader.py`:
```python
model = WhisperModel("base", device="cuda", compute_type="float16")
```

## Changing AI Model

Edit `.env`:
```env
# For maximum reasoning quality
OLLAMA_MODEL=deepseek-r1:14b

# For fastest responses
OLLAMA_MODEL=llama3.2:latest

# For multilingual (Hindi/Sindhi/Punjabi)
OLLAMA_MODEL=qwen2.5:14b
```

## Troubleshooting

| Problem | Solution |
|---------|---------|
| `Ollama not running` | Run `ollama serve` first |
| `Embedding error` | Update Ollama: `ollama pull nomic-embed-text` |
| `0 chunks added` | Check `data/processed/seen_hashes.json` — delete to re-ingest |
| `Gmail 403` | Add your email as test user in Google Cloud Console |
| `Notion 0 pages` | Regenerate token and share pages with integration |
| Phone can't connect | Use phone hotspot — university WiFi blocks device-to-device |