import { useState, useEffect } from 'react'
import { getSources, deleteSource } from '../api/client'

export default function KnowledgeBase({ refresh }) {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getSources()
      setSources(res.data.sources || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [refresh])

  const handleDelete = async (name) => {
    if (!confirm(`Delete all chunks from "${name}"?`)) return
    await deleteSource(name)
    load()
  }

  const typeIcon = (type) => {
    const icons = { pdf: '📕', docx: '📘', txt: '📄', markdown: '📝', webpage: '🌐' }
    return icons[type] || '📄'
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        fontSize: '11px', color: '#60a5fa',
        fontFamily: 'monospace', letterSpacing: '2px', marginBottom: '12px'
      }}>
        // SOURCES · {sources.length} ingested
      </div>

      {loading && <div style={{ color: '#555', fontSize: '12px' }}>Loading...</div>}

      {!loading && sources.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 16px',
          color: '#333', fontSize: '12px', lineHeight: '2'
        }}>
          No documents yet.<br />
          Go to Upload tab to add files.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sources.map((src, i) => (
          <div key={i} style={{
            background: '#0a0a14',
            border: '1px solid #1a1a2e',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '16px' }}>{typeIcon(src.type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px', color: '#ccc', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {src.name}
              </div>
              <div style={{ fontSize: '10px', color: '#444', fontFamily: 'monospace' }}>
                {src.type} · {src.chunk_count} chunks · {src.date_ingested?.slice(0, 10)}
              </div>
            </div>
            <button
              onClick={() => handleDelete(src.name)}
              style={{
                background: 'none', border: '1px solid #2a1a1a',
                borderRadius: '6px', padding: '3px 8px',
                color: '#f87171', fontSize: '11px', cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}