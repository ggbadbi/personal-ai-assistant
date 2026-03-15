import { useState } from 'react'
import { ingestFile, ingestURL } from '../api/client'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function FileUpload({ onIngested }) {
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState('')
  const [ytUrl, setYtUrl] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [inputTab, setInputTab] = useState('file')
  const [gmailDays, setGmailDays] = useState(30)
  const [gmailMax, setGmailMax] = useState(100)
  const [gmailStatus, setGmailStatus] = useState(null)

  const inputTabStyle = (key) => ({
    flex: 1, padding: '7px 2px',
    background: inputTab === key ? 'rgba(0,212,224,0.1)' : 'transparent',
    border: 'none',
    borderBottom: `2px solid ${inputTab === key ? 'var(--teal-bright)' : 'transparent'}`,
    color: inputTab === key ? 'var(--teal-bright)' : 'var(--text-muted)',
    fontSize: '10px', cursor: 'pointer',
    fontFamily: 'JetBrains Mono', transition: 'all 0.2s'
  })

  const handleFiles = async (files) => {
    setLoading(true); setResults([]); setExpanded(null)
    const newResults = []
    for (const file of files) {
      try {
        const res = await ingestFile(file)
        newResults.push({ name: file.name, status: 'success', chunks: res.data.chunks_added, summary: res.data.summary || null, icon: '📄' })
      } catch (e) {
        newResults.push({ name: file.name, status: 'error', error: e.response?.data?.detail || e.message, icon: '📄' })
      }
    }
    setResults(newResults); setLoading(false); onIngested?.()
  }

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); handleFiles([...e.dataTransfer.files]) }

  const handleURL = async () => {
    if (!url.trim()) return
    setLoading(true); setResults([])
    try {
      const res = await ingestURL(url)
      setResults([{ name: res.data.title || url, status: 'success', chunks: res.data.chunks_added, summary: null, icon: '🌐' }])
      setUrl(''); onIngested?.()
    } catch (e) {
      setResults([{ name: url, status: 'error', error: e.response?.data?.detail || e.message, icon: '🌐' }])
    }
    setLoading(false)
  }

  const handleYouTube = async () => {
    if (!ytUrl.trim()) return
    setLoading(true); setResults([])
    try {
      const res = await api.post('/ingest/youtube', { url: ytUrl })
      setResults([{
        name: res.data.title, icon: '📺',
        status: res.data.chunks_added > 0 ? 'success' : 'error',
        chunks: res.data.chunks_added,
        summary: res.data.summary || null,
        error: res.data.chunks_added === 0 ? 'No transcript available' : null
      }])
      if (res.data.chunks_added > 0) { setYtUrl(''); onIngested?.() }
    } catch (e) {
      setResults([{ name: ytUrl, status: 'error', error: e.response?.data?.detail || e.message, icon: '📺' }])
    }
    setLoading(false)
  }

  const handleGmail = async () => {
    setLoading(true); setResults([])
    try {
      const res = await api.post('/ingest/gmail', { max_emails: gmailMax, days_back: gmailDays })
      setResults([{
        name: 'Gmail Inbox', icon: '📧', status: 'success',
        chunks: res.data.chunks_added,
        summary: `Fetched ${res.data.emails_fetched} emails → ${res.data.chunks_added} searchable chunks`
      }])
      onIngested?.()
    } catch (e) {
      setResults([{ name: 'Gmail', status: 'error', error: e.response?.data?.detail || e.message, icon: '📧' }])
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', background: 'rgba(0,212,224,0.04)',
    border: '1px solid rgba(0,212,224,0.15)', borderRadius: '8px',
    padding: '9px 14px', color: 'var(--text-primary)',
    fontSize: '13px', outline: 'none', fontFamily: 'Outfit'
  }

  const actionBtn = (color = '#00d4e0', disabled = false) => ({
    width: '100%', padding: '10px',
    background: disabled ? 'rgba(0,0,0,0.2)' : `rgba(${color === '#00d4e0' ? '0,212,224' : color === '#4ade80' ? '74,222,128' : color === '#f87171' ? '248,113,113' : '0,212,224'},0.08)`,
    border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : `${color}33`}`,
    borderRadius: '8px', color: disabled ? 'var(--text-muted)' : color,
    fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'Outfit', fontWeight: 600, transition: 'all 0.2s'
  })

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '9px', color: 'var(--teal-bright)', fontFamily: 'JetBrains Mono', letterSpacing: '3px' }}>
        // INGEST KNOWLEDGE
      </div>

      {/* Input tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'file', label: '📄 FILE' },
          { key: 'url', label: '🌐 URL' },
          { key: 'youtube', label: '📺 YT' },
          { key: 'gmail', label: '📧 MAIL' },
        ].map(t => (
          <button key={t.key} onClick={() => setInputTab(t.key)} style={inputTabStyle(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* FILE */}
      {inputTab === 'file' && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !loading && document.getElementById('fileInput').click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--teal-bright)' : 'var(--border)'}`,
            borderRadius: '12px', padding: '28px', textAlign: 'center',
            cursor: loading ? 'wait' : 'pointer',
            background: dragging ? 'rgba(0,212,224,0.05)' : 'rgba(0,212,224,0.02)',
            transition: 'all 0.2s'
          }}
        >
          {loading ? (
            <>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚙️</div>
              <div style={{ fontSize: '13px', color: 'var(--teal)' }}>Processing & summarizing...</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>May take 10–30 seconds</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Drop files or click to browse</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>PDF · DOCX · TXT · MD</div>
            </>
          )}
          <input id="fileInput" type="file" multiple accept=".pdf,.docx,.txt,.md"
            style={{ display: 'none' }} onChange={e => handleFiles([...e.target.files])} />
        </div>
      )}

      {/* URL */}
      {inputTab === 'url' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleURL()}
            placeholder="https://example.com/article..." style={inputStyle} />
          <button onClick={handleURL} disabled={loading || !url.trim()} style={actionBtn('#4ade80', loading || !url.trim())}>
            {loading ? '⚙️ Ingesting...' : '🌐 Ingest URL'}
          </button>
        </div>
      )}

      {/* YouTube */}
      {inputTab === 'youtube' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.15)',
            borderRadius: '8px', padding: '10px 12px',
            fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6'
          }}>
            📺 Paste any YouTube URL. Captions fetched automatically — Whisper used as fallback.
          </div>
          <input value={ytUrl} onChange={e => setYtUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleYouTube()}
            placeholder="https://www.youtube.com/watch?v=..." style={inputStyle} />
          <button onClick={handleYouTube} disabled={loading || !ytUrl.trim()} style={actionBtn('#f87171', loading || !ytUrl.trim())}>
            {loading ? '⚙️ Fetching transcript...' : '📺 Ingest YouTube Video'}
          </button>
        </div>
      )}

      {/* Gmail */}
      {inputTab === 'gmail' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            background: 'rgba(0,212,224,0.04)', border: '1px solid rgba(0,212,224,0.15)',
            borderRadius: '8px', padding: '12px',
            fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.7'
          }}>
            📧 Connects to Gmail via OAuth2.<br/>
            Requires <code style={{ color: 'var(--teal-bright)', fontFamily: 'JetBrains Mono' }}>credentials.json</code> in project root.<br/>
            <span style={{ color: '#00ff88' }}>Read-only</span> — never sends or modifies emails.
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={gmailDays} onChange={e => setGmailDays(Number(e.target.value))} style={{
              flex: 1, background: 'var(--ocean-surface)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px', color: 'var(--text-primary)',
              fontSize: '11px', outline: 'none', fontFamily: 'JetBrains Mono'
            }}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <select value={gmailMax} onChange={e => setGmailMax(Number(e.target.value))} style={{
              flex: 1, background: 'var(--ocean-surface)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '8px', color: 'var(--text-primary)',
              fontSize: '11px', outline: 'none', fontFamily: 'JetBrains Mono'
            }}>
              <option value={50}>50 emails</option>
              <option value={100}>100 emails</option>
              <option value={200}>200 emails</option>
              <option value={500}>500 emails</option>
            </select>
          </div>

          <button onClick={handleGmail} disabled={loading} style={actionBtn('#00d4e0', loading)}>
            {loading ? '⚙️ Connecting to Gmail...' : '📧 Connect & Ingest Gmail'}
          </button>

          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textAlign: 'center' }}>
            First run opens browser for Google sign-in
          </div>
        </div>
      )}

      {/* Results */}
      {results.map((r, i) => (
        <div key={i} style={{
          background: 'rgba(7,30,51,0.8)',
          border: `1px solid ${r.status === 'success' ? 'rgba(0,255,136,0.2)' : 'rgba(255,107,107,0.2)'}`,
          borderRadius: '10px', overflow: 'hidden'
        }}>
          <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{r.status === 'success' ? '✅' : '❌'}</span>
            <span style={{ fontSize: '14px' }}>{r.icon}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </span>
            {r.chunks !== undefined && (
              <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', fontSize: '10px' }}>
                {r.chunks} chunks
              </span>
            )}
          </div>

          {r.summary && (
            <>
              <button onClick={() => setExpanded(expanded === i ? null : i)} style={{
                width: '100%', padding: '7px 12px',
                background: 'rgba(0,212,224,0.04)', border: 'none',
                borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', textAlign: 'left'
              }}>
                <span style={{ fontSize: '10px', color: 'var(--teal-bright)' }}>
                  {expanded === i ? '▼' : '▶'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--teal-bright)', fontFamily: 'JetBrains Mono', letterSpacing: '1px' }}>
                  {expanded === i ? 'HIDE SUMMARY' : 'VIEW AUTO-SUMMARY'}
                </span>
              </button>
              {expanded === i && (
                <div style={{
                  padding: '12px', background: 'rgba(0,212,224,0.02)',
                  borderTop: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--text-secondary)',
                  lineHeight: '1.8', whiteSpace: 'pre-wrap'
                }}>
                  {r.summary}
                </div>
              )}
            </>
          )}

          {r.error && (
            <div style={{ padding: '8px 12px', fontSize: '11px', color: '#ff6b6b', borderTop: '1px solid rgba(255,107,107,0.15)' }}>
              {r.error}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}