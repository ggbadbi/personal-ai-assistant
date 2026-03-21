import { useState, useEffect } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function AuditLog() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/audit/log')
        setEvents(res.data.events || [])
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  const eventColor = (type) => {
    if (type.includes('SUCCESS') || type.includes('START')) return '#00ff88'
    if (type.includes('FAILED') || type.includes('ERROR')) return '#ff6b6b'
    if (type.includes('LOGIN')) return '#00d4e0'
    if (type.includes('LOGOUT')) return '#f59e0b'
    return '#7ab3c8'
  }

  const eventIcon = (type) => {
    if (type === 'LOGIN_SUCCESS') return '✅'
    if (type === 'LOGIN_FAILED') return '❌'
    if (type === 'LOGOUT') return '🚪'
    if (type === 'SERVER_START') return '🚀'
    if (type.includes('INGEST')) return '📥'
    if (type.includes('CHAT')) return '💬'
    return '📋'
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ fontSize: '9px', color: '#00d4e0', fontFamily: 'JetBrains Mono', letterSpacing: '3px', marginBottom: '12px' }}>
        // AUDIT LOG
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading...</div>}

      {!loading && events.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
          No events logged yet.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {events.map((e, i) => (
          <div key={i} style={{
            background: 'rgba(7,30,51,0.8)',
            border: `1px solid rgba(${eventColor(e.event_type) === '#00ff88' ? '0,255,136' : eventColor(e.event_type) === '#ff6b6b' ? '255,107,107' : '20,168,173'},0.15)`,
            borderLeft: `3px solid ${eventColor(e.event_type)}`,
            borderRadius: '8px', padding: '8px 10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span style={{ fontSize: '12px' }}>{eventIcon(e.event_type)}</span>
              <span style={{ fontSize: '11px', color: eventColor(e.event_type), fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                {e.event_type}
              </span>
              {e.ip_address && (
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'JetBrains Mono' }}>
                  {e.ip_address}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{e.description}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: '3px' }}>
              {e.timestamp?.slice(0, 16).replace('T', ' ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}