import { useState, useEffect } from 'react'
import { getHealth } from '../api/client'
import FileUpload from './FileUpload'
import KnowledgeBase from './KnowledgeBase'
import Analytics from './Analytics'
import StudyMode from './StudyMode'
import KnowledgeGraph from './KnowledgeGraph'

export default function Sidebar({ onClose, isMobile = false }) {
  const [health, setHealth] = useState(null)
  const [tab, setTab] = useState('upload')
  const [refreshKB, setRefreshKB] = useState(0)
  const [graphOpen, setGraphOpen] = useState(false)

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

  const tabs = [
    { key: 'upload', label: '⬆', title: 'Upload' },
    { key: 'sources', label: '📚', title: 'Sources' },
    { key: 'analytics', label: '📊', title: 'Stats' },
    { key: 'study', label: '🎓', title: 'Study' },
    { key: 'graph', label: '🕸', title: 'Graph' },
  ]

  return (
    <div style={{
      width: isMobile ? '280px' : '300px',
      minWidth: isMobile ? '280px' : '300px',
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'rgba(4,20,36,0.98)',
      borderRight: '1px solid var(--border)',
      backdropFilter: 'blur(20px)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(13,115,119,0.15) 0%, transparent 100%)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '3px' }}>
              KNOWLEDGE CORE
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Neural Base
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '5px 8px',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px'
          }}>
            ✕
          </button>
        </div>

        {health && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: 'LLM', ok: health.ollama },
              { label: 'DB', ok: health.vector_db },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: s.ok ? 'rgba(0,255,136,0.08)' : 'rgba(255,107,107,0.08)',
                border: `1px solid ${s.ok ? 'rgba(0,255,136,0.2)' : 'rgba(255,107,107,0.2)'}`,
                borderRadius: '20px', padding: '3px 10px'
              }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.ok ? '#00ff88' : '#ff6b6b', boxShadow: `0 0 4px ${s.ok ? '#00ff88' : '#ff6b6b'}` }} />
                <span style={{ fontSize: '10px', color: s.ok ? '#00ff88' : '#ff6b6b', fontFamily: 'JetBrains Mono' }}>{s.label}</span>
              </div>
            ))}
            <div style={{ background: 'rgba(0,212,224,0.08)', border: '1px solid rgba(0,212,224,0.2)', borderRadius: '20px', padding: '3px 10px' }}>
              <span style={{ fontSize: '10px', color: 'var(--teal-bright)', fontFamily: 'JetBrains Mono' }}>{health.total_documents} chunks</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} title={t.title} style={{
            flex: 1, padding: '8px 1px',
            background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.key ? 'var(--teal-bright)' : 'transparent'}`,
            color: tab === t.key ? 'var(--teal-bright)' : 'var(--text-muted)',
            fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
          }}>
            {t.label}
            <div style={{ fontSize: '7px', fontFamily: 'JetBrains Mono', marginTop: '2px', opacity: 0.7 }}>{t.title}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {tab === 'upload' && <FileUpload onIngested={() => setRefreshKB(r => r + 1)} />}
        {tab === 'sources' && <KnowledgeBase refresh={refreshKB} />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'study' && <StudyMode />}
        {tab === 'graph' && (
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '48px' }}>🕸</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.6' }}>
              Interactive visual map showing how your documents, emails, and videos connect through shared topics
            </div>
            <button
              onClick={() => setGraphOpen(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,224,0.2), rgba(0,212,224,0.1))',
                border: '1px solid rgba(0,212,224,0.3)', borderRadius: '12px',
                padding: '14px 24px', color: '#00d4e0', fontSize: '14px',
                cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700,
                width: '100%', letterSpacing: '0.5px'
              }}
            >
              🕸 Open Knowledge Graph
            </button>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', textAlign: 'center', opacity: 0.6 }}>
              Opens fullscreen · Drag nodes · Scroll to zoom
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen graph overlay */}
      {graphOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(2,13,26,0.98)',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Graph header */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(4,20,36,0.9)', backdropFilter: 'blur(20px)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🕸</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--teal-bright)' }}>
                  Knowledge Graph
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                  Visual map of your knowledge connections
                </div>
              </div>
            </div>
            <button
              onClick={() => setGraphOpen(false)}
              style={{
                background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
                borderRadius: '8px', padding: '6px 14px',
                color: '#ff6b6b', cursor: 'pointer', fontSize: '13px',
                fontFamily: 'Outfit'
              }}
            >
              ✕ Close
            </button>
          </div>

          {/* Graph content */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <KnowledgeGraph />
          </div>
        </div>
      )}
    </div>
  )
}