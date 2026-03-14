import { useState } from 'react'
import { ingestFile, ingestURL } from '../api/client'

export default function FileUpload({ onIngested }) {
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFiles = async (files) => {
    setLoading(true)
    setStatus(null)
    const results = []
    for (const file of files) {
      try {
        const res = await ingestFile(file)
        results.push(`✅ ${file.name}: ${res.data.chunks_added} chunks added`)
      } catch (e) {
        results.push(`❌ ${file.name}: ${e.response?.data?.detail || e.message}`)
      }
    }
    setStatus(results.join('\n'))
    setLoading(false)
    onIngested?.()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles([...e.dataTransfer.files])
  }

  const handleURL = async () => {
    if (!url.trim()) return
    setLoading(true)
    setStatus(null)
    try {
      const res = await ingestURL(url)
      setStatus(`✅ "${res.data.title}": ${res.data.chunks_added} chunks added`)
      setUrl('')
      onIngested?.()
    } catch (e) {
      setStatus(`❌ Failed: ${e.response?.data?.detail || e.message}`)
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '11px', color: '#60a5fa', fontFamily: 'monospace', letterSpacing: '2px' }}>
        // INGEST DOCUMENTS
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => document.getElementById('fileInput').click()}
        style={{
          border: `2px dashed ${dragging ? '#60a5fa' : '#1e1e2e'}`,
          borderRadius: '12px',
          padding: '28px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#0a1020' : '#0a0a14',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
        <div style={{ fontSize: '13px', color: '#888' }}>
          {loading ? 'Processing...' : 'Drop files here or click to browse'}
        </div>
        <div style={{ fontSize: '11px', color: '#444', marginTop: '4px' }}>
          PDF · DOCX · TXT · MD
        </div>
        <input
          id="fileInput"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          style={{ display: 'none' }}
          onChange={e => handleFiles([...e.target.files])}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleURL()}
          placeholder="Paste a URL to ingest..."
          style={{
            flex: 1,
            background: '#0f0f1a',
            border: '1px solid #1e1e2e',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#e0e0f0',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleURL}
          disabled={loading || !url.trim()}
          style={{
            background: '#0a1a0a',
            border: '1px solid #1a3a1a',
            borderRadius: '8px',
            padding: '8px 14px',
            color: '#4ade80',
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {loading ? '...' : 'Ingest'}
        </button>
      </div>

      {status && (
        <div style={{
          background: '#080810',
          border: '1px solid #1a1a2e',
          borderRadius: '8px',
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#4ade80',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.6'
        }}>
          {status}
        </div>
      )}
    </div>
  )
}