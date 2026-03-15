import { useState, useEffect, useRef } from 'react'
import { getSources, deleteSource } from '../api/client'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function KnowledgeBase({ refresh }) {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [reuploading, setReuploading] = useState(null)
  const fileInputRef = useRef(null)
  const [selectedSource, setSelectedSource] = useState(null)

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

  const handleReupload = (sourceName) => {
    setSelectedSource(sourceName)
    fileInputRef.current.click()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files[0]
    if (!file || !selectedSource) return
    setReuploading(selectedSource)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post(
        `/ingest/reupload?source_name=${encodeURIComponent(selectedSource)}`,
        form
      )
      alert(`✅ Re-uploaded!\nOld chunks deleted: ${res.data.old_chunks_deleted}\nNew chunks added: ${res.data.new_chunks_added}`)
      load()
    } catch (e) {
      alert(`❌ Error: ${e.response?.data?.detail || e.message}`)
    }

    setReuploading(null)
    setSelectedSource(null)
    e.target.value = ''
  }

  const typeIcon = (type) => {
    const icons = { pdf: '📕', docx: '📘', txt: '📄', markdown: '📝', webpage: '🌐', youtube: '📺' }
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

      {/* Hidden file input for re-upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sources.map((src, i) => (
          <div key={i} style={{
            background: '#0a0a14',
            border: '1px solid #1a1a2e',
            borderRadius: '8px',
            padding: '10px 12px',
          }}>
            {/* Source info row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {/* Re-upload button — only for file types */}
              {['txt', 'pdf', 'docx', 'markdown'].includes(src.type) && (
                <button
                  onClick={() => handleReupload(src.name)}
                  disabled={reuploading === src.name}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: '1px solid #1a2a3a',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    color: '#60a5fa',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontFamily: 'monospace'
                  }}
                >
                  {reuploading === src.name ? '⚙️ updating...' : '🔄 re-upload'}
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={() => handleDelete(src.name)}
                style={{
                  background: 'none',
                  border: '1px solid #2a1a1a',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  color: '#f87171',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                ✕ delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}