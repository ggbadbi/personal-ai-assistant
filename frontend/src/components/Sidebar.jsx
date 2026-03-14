import { useState, useEffect } from 'react'
import { getHealth } from '../api/client'
import FileUpload from './FileUpload'
import KnowledgeBase from './KnowledgeBase'

export default function Sidebar() {
  const [health, setHealth] = useState(null)
  const [tab, setTab] = useState('upload')
  const [refreshKB, setRefreshKB] = useState(0)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await getHealth()
        setHealth(res.data)
      } catch {
        setHealth({ status: 'error', ollama: false, vector_db: false, total_documents: 0 })
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      width: '300px', minWidth: '300px',
      background: '#080810',
      borderRight: '1px solid #1a1a2e',
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden'
    }}>
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid #1a1a2e' }}>
        <div style={{
          fontFamily: 'monospace', fontSize: '9px',
          color: '#444', letterSpacing: '2px', marginBottom: '4px'
        }}>
          PERSONAL AI ASSISTANT
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#e0e0f0' }}>
          Knowledge Base
        </div>

        {health && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: health.ollama ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
              ● LLM {health.ollama ? 'ON' : 'OFF'}
            </span>
            <span style={{ fontSize: '10px', color: health.vector_db ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
              ● DB {health.vector_db ? 'ON' : 'OFF'}
            </span>
            <span style={{ fontSize: '10px', color: '#60a5fa', fontFamily: 'monospace' }}>
              {health.total_documents} chunks
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #1a1a2e' }}>
        {['upload', 'sources'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '10px',
              background: tab === t ? '#0f0f1a' : 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid #60a5fa' : '2px solid transparent',
              color: tab === t ? '#60a5fa' : '#555',
              fontSize: '11px', fontFamily: 'monospace',
              letterSpacing: '1px', cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'upload' && (
          <FileUpload onIngested={() => {
            setRefreshKB(r => r + 1)
            setTab('sources')
          }} />
        )}
        {tab === 'sources' && <KnowledgeBase refresh={refreshKB} />}
      </div>
    </div>
  )
}