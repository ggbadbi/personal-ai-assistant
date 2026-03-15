import { useState } from 'react'
import { ingestFile, ingestURL } from '../api/client'

export default function FileUpload({ onIngested }) {
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const handleFiles = async (files) => {
    setLoading(true)
    setResults([])
    setExpanded(null)
    const newResults = []

    for (const file of files) {
      try {
        const res = await ingestFile(file)
        console.log('INGEST RESPONSE:', res.data)
        newResults.push({
          name: file.name,
          status: 'success',
          chunks: res.data.chunks_added,
          summary: res.data.summary || null
        })
      } catch (e) {
        console.log('INGEST ERROR:', e.response?.data || e.message)
        newResults.push({
          name: file.name,
          status: 'error',
          error: e.response?.data?.detail || e.message
        })
      }
    }

    setResults(newResults)
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
    setResults([])
    try {
      const res = await ingestURL(url)
      setResults([{
        name: res.data.title || url,
        status: 'success',
        chunks: res.data.chunks_added,
        summary: null
      }])
      setUrl('')
      onIngested?.()
    } catch (e) {
      setResults([{
        name: url,
        status: 'error',
        error: e.response?.data?.detail || e.message
      }])
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '11px', color: '#60a5fa', fontFamily: 'monospace', letterSpacing: '2px' }}>
        // INGEST DOCUMENTS
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !loading && document.getElementById('fileInput').click()}
        style={{
          border: `2px dashed ${dragging ? '#60a5fa' : '#1e1e2e'}`,
          borderRadius: '12px', padding: '24px',
          textAlign: 'center',
          cursor: loading ? 'wait' : 'pointer',
          background: dragging ? '#0a1020' : '#0a0a14',
          transition: 'all 0.2s'
        }}
      >
        {loading ? (
          <>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚙️</div>
            <div style={{ fontSize: '13px', color: '#60a5fa' }}>Processing & summarizing...</div>
            <div style={{ fontSize: '11px', color: '#444', marginTop: '4px' }}>May take 10–30 seconds</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📂</div>
            <div style={{ fontSize: '13px', color: '#888' }}>Drop files or click to browse</div>
            <div style={{ fontSize: '11px', color: '#444', marginTop: '4px' }}>PDF · DOCX · TXT · MD</div>
          </>
        )}
        <input
          id="fileInput" type="file" multiple
          accept=".pdf,.docx,.txt,.md"
          style={{ display: 'none' }}
          onChange={e => handleFiles([...e.target.files])}
        />
      </div>

      {/* URL */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleURL()}
          placeholder="Paste a URL to ingest..."
          style={{
            flex: 1, background: '#0f0f1a',
            border: '1px solid #1e1e2e', borderRadius: '8px',
            padding: '8px 12px', color: '#e0e0f0',
            fontSize: '13px', outline: 'none'
          }}
        />
        <button onClick={handleURL} disabled={loading || !url.trim()} style={{
          background: '#0a1a0a', border: '1px solid #1a3a1a',
          borderRadius: '8px', padding: '8px 14px',
          color: '#4ade80', fontSize: '12px', cursor: 'pointer'
        }}>
          {loading ? '...' : 'Ingest'}
        </button>
      </div>

      {/* Results */}
      {results.map((r, i) => (
        <div key={i} style={{
          background: '#080810',
          border: `1px solid ${r.status === 'success' ? '#1a3a1a' : '#3a1a1a'}`,
          borderRadius: '10px', overflow: 'hidden'
        }}>
          {/* Header row */}
          <div style={{
            padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>{r.status === 'success' ? '✅' : '❌'}</span>
            <span style={{
              color: '#ccc', fontWeight: 600, fontSize: '12px',
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {r.name}
            </span>
            {r.chunks !== undefined && (
              <span style={{ color: '#555', fontFamily: 'monospace', fontSize: '10px' }}>
                {r.chunks} chunks
              </span>
            )}
          </div>

          {/* Summary toggle */}
          {r.summary && (
            <>
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{
                  width: '100%', padding: '7px 12px',
                  background: '#0a1020', border: 'none',
                  borderTop: '1px solid #1a2a1a',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                <span style={{ fontSize: '10px', color: '#60a5fa' }}>
                  {expanded === i ? '▼' : '▶'}
                </span>
                <span style={{
                  fontSize: '10px', color: '#60a5fa',
                  fontFamily: 'monospace', letterSpacing: '1px'
                }}>
                  {expanded === i ? 'HIDE SUMMARY' : 'VIEW AUTO-SUMMARY'}
                </span>
              </button>

              {expanded === i && (
                <div style={{
                  padding: '12px',
                  background: '#060610',
                  borderTop: '1px solid #1a2030',
                  fontSize: '12px', color: '#8ab4d4',
                  lineHeight: '1.8', whiteSpace: 'pre-wrap'
                }}>
                  {r.summary}
                </div>
              )}
            </>
          )}

          {r.error && (
            <div style={{
              padding: '8px 12px', fontSize: '11px',
              color: '#f87171', borderTop: '1px solid #3a1a1a'
            }}>
              {r.error}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}