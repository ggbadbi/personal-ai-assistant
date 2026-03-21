import { useState, useEffect } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function SyncStatus() {
  const [status, setStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [interval, setIntervalHours] = useState(6)

  const load = async () => {
    try {
      const res = await api.get('/sync/status')
      setStatus(res.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [])

  const triggerSync = async () => {
    setSyncing(true)
    try {
      await api.post('/sync/trigger')
      setTimeout(() => { load(); setSyncing(false) }, 3000)
    } catch (e) { setSyncing(false) }
  }

  const toggleAutoSync = async () => {
    if (status?.auto_sync_enabled) {
      await api.post('/sync/stop')
    } else {
      await api.post('/sync/start', { interval_hours: interval })
    }
    setTimeout(load, 500)
  }

  const formatTime = (iso) => {
    if (!iso) return 'Never'
    const d = new Date(iso)
    return d.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
  }

  const timeUntilNext = (iso) => {
    if (!iso) return ''
    const diff = new Date(iso) - new Date()
    if (diff <= 0) return 'Due now'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const statusColor = (s) => {
    if (s === 'ok') return '#00ff88'
    if (s === 'error') return '#ff6b6b'
    if (s === 'syncing') return '#ffd700'
    if (s === 'skipped') return '#f59e0b'
    return '#3a6278'
  }

  const card = {
    background: 'rgba(7,30,51,0.8)',
    border: '1px solid rgba(20,168,173,0.2)',
    borderRadius: '12px', padding: '14px',
    marginBottom: '10px'
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '9px', color: '#00d4e0', fontFamily: 'JetBrains Mono', letterSpacing: '3px' }}>
        // AUTO-SYNC ENGINE
      </div>

      {/* Auto-sync toggle */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: status?.auto_sync_enabled ? '#00ff88' : 'var(--text-muted)' }}>
              Auto-Sync {status?.auto_sync_enabled ? 'ON' : 'OFF'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              Gmail + Notion every {status?.interval_hours || 6}h
            </div>
          </div>
          <button
            onClick={toggleAutoSync}
            style={{
              background: status?.auto_sync_enabled ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,224,0.1)',
              border: `1px solid ${status?.auto_sync_enabled ? 'rgba(0,255,136,0.3)' : 'rgba(0,212,224,0.3)'}`,
              borderRadius: '20px', padding: '6px 16px',
              color: status?.auto_sync_enabled ? '#00ff88' : '#00d4e0',
              fontSize: '12px', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600
            }}
          >
            {status?.auto_sync_enabled ? '⏸ Pause' : '▶ Start'}
          </button>
        </div>

        {/* Interval selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sync every:</span>
          {[1, 3, 6, 12, 24].map(h => (
            <button
              key={h}
              onClick={() => setIntervalHours(h)}
              style={{
                background: interval === h ? 'rgba(0,212,224,0.15)' : 'transparent',
                border: `1px solid ${interval === h ? 'rgba(0,212,224,0.4)' : 'var(--border)'}`,
                borderRadius: '6px', padding: '3px 8px',
                color: interval === h ? '#00d4e0' : 'var(--text-muted)',
                fontSize: '10px', cursor: 'pointer', fontFamily: 'JetBrains Mono'
              }}
            >
              {h}h
            </button>
          ))}
        </div>

        {/* Next sync */}
        {status?.next_sync && status?.auto_sync_enabled && (
          <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
            NEXT SYNC: {formatTime(status.next_sync)} ({timeUntilNext(status.next_sync)})
          </div>
        )}
      </div>

      {/* Manual sync button */}
      <button
        onClick={triggerSync}
        disabled={syncing}
        style={{
          width: '100%', padding: '12px',
          background: syncing ? 'rgba(0,0,0,0.2)' : 'rgba(0,212,224,0.08)',
          border: `1px solid ${syncing ? 'var(--border)' : 'rgba(0,212,224,0.3)'}`,
          borderRadius: '10px', color: syncing ? 'var(--text-muted)' : '#00d4e0',
          fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer',
          fontFamily: 'Outfit', fontWeight: 600, transition: 'all 0.2s'
        }}
      >
        {syncing ? '⚙️ Syncing now...' : '🔄 Sync Now'}
      </button>

      {/* Gmail status */}
      {status?.gmail && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>📧</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Gmail</span>
            <span style={{
              marginLeft: 'auto', fontSize: '10px', fontFamily: 'JetBrains Mono',
              color: statusColor(status.gmail.status),
              background: `${statusColor(status.gmail.status)}11`,
              border: `1px solid ${statusColor(status.gmail.status)}33`,
              borderRadius: '10px', padding: '2px 8px'
            }}>
              {status.gmail.status.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>LAST SYNC</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatTime(status.gmail.last_sync)}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>CHUNKS ADDED</div>
              <div style={{ fontSize: '11px', color: '#00d4e0' }}>{status.gmail.chunks_added}</div>
            </div>
          </div>
          {status.gmail.error && (
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#ff6b6b', fontFamily: 'JetBrains Mono' }}>
              ERR: {status.gmail.error.slice(0, 60)}
            </div>
          )}
        </div>
      )}

      {/* Notion status */}
      {status?.notion && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>📓</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Notion</span>
            <span style={{
              marginLeft: 'auto', fontSize: '10px', fontFamily: 'JetBrains Mono',
              color: statusColor(status.notion.status),
              background: `${statusColor(status.notion.status)}11`,
              border: `1px solid ${statusColor(status.notion.status)}33`,
              borderRadius: '10px', padding: '2px 8px'
            }}>
              {status.notion.status.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>LAST SYNC</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatTime(status.notion.last_sync)}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>CHUNKS ADDED</div>
              <div style={{ fontSize: '11px', color: '#a78bfa' }}>{status.notion.chunks_added}</div>
            </div>
          </div>
          {status.notion.error && (
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#ff6b6b', fontFamily: 'JetBrains Mono' }}>
              ERR: {status.notion.error.slice(0, 60)}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div style={{
        background: 'rgba(0,212,224,0.03)', border: '1px solid rgba(0,212,224,0.1)',
        borderRadius: '8px', padding: '10px 12px',
        fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.7',
        fontFamily: 'JetBrains Mono'
      }}>
        AUTO-SYNC fetches only NEW emails (last 24h) and changed Notion pages.
        Deduplication ensures no content is indexed twice.
        Runs silently in background while you use the app.
      </div>
    </div>
  )
}