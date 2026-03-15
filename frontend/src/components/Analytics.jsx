import { useState, useEffect } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/analytics')
        setStats(res.data)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div style={{ padding: '20px', color: '#555', fontSize: '12px' }}>
      Loading analytics...
    </div>
  )

  if (!stats) return (
    <div style={{ padding: '20px', color: '#f87171', fontSize: '12px' }}>
      Could not load analytics.
    </div>
  )

  const maxDaily = Math.max(...(stats.daily_activity.map(d => d.count)), 1)
  const maxTopic = Math.max(...(stats.top_topics.map(t => t.count)), 1)

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ fontSize: '11px', color: '#60a5fa', fontFamily: 'monospace', letterSpacing: '2px' }}>
        // ANALYTICS DASHBOARD
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Total Queries', value: stats.total_queries, color: '#60a5fa' },
          { label: 'Today', value: stats.queries_today, color: '#4ade80' },
          { label: 'This Week', value: stats.queries_week, color: '#c084fc' },
          { label: 'Docs Ingested', value: stats.total_docs_ingested, color: '#fb923c' },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#0a0a14',
            border: '1px solid #1a1a2e',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px', fontWeight: 700,
              color: s.color, fontFamily: 'monospace'
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Daily activity bar chart */}
      {stats.daily_activity.length > 0 && (
        <div style={{
          background: '#0a0a14',
          border: '1px solid #1a1a2e',
          borderRadius: '10px',
          padding: '12px'
        }}>
          <div style={{
            fontSize: '10px', color: '#60a5fa',
            fontFamily: 'monospace', marginBottom: '12px'
          }}>
            // QUERIES PER DAY
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '60px' }}>
            {stats.daily_activity.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(4, (d.count / maxDaily) * 50)}px`,
                  background: '#60a5fa',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.8
                }} />
                <div style={{ fontSize: '8px', color: '#444', fontFamily: 'monospace' }}>
                  {d.day.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top topics */}
      {stats.top_topics.length > 0 && (
        <div style={{
          background: '#0a0a14',
          border: '1px solid #1a1a2e',
          borderRadius: '10px',
          padding: '12px'
        }}>
          <div style={{
            fontSize: '10px', color: '#c084fc',
            fontFamily: 'monospace', marginBottom: '12px'
          }}>
            // TOP TOPICS YOU QUERY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stats.top_topics.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  fontSize: '11px', color: '#888',
                  minWidth: '80px', fontFamily: 'monospace'
                }}>
                  {t.word}
                </div>
                <div style={{
                  flex: 1, height: '6px',
                  background: '#1a1a2e',
                  borderRadius: '3px', overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(t.count / maxTopic) * 100}%`,
                    height: '100%',
                    background: '#c084fc',
                    borderRadius: '3px'
                  }} />
                </div>
                <div style={{
                  fontSize: '10px', color: '#555',
                  fontFamily: 'monospace', minWidth: '20px'
                }}>
                  {t.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source types breakdown */}
      {stats.by_source_type.length > 0 && (
        <div style={{
          background: '#0a0a14',
          border: '1px solid #1a1a2e',
          borderRadius: '10px',
          padding: '12px'
        }}>
          <div style={{
            fontSize: '10px', color: '#fb923c',
            fontFamily: 'monospace', marginBottom: '12px'
          }}>
            // INGESTED BY TYPE
          </div>
          {stats.by_source_type.map((s, i) => {
            const icons = { file: '📄', youtube: '📺', webpage: '🌐' }
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center',
                gap: '8px', marginBottom: '6px'
              }}>
                <span style={{ fontSize: '14px' }}>{icons[s.source_type] || '📄'}</span>
                <span style={{ fontSize: '11px', color: '#888', flex: 1 }}>
                  {s.source_type}
                </span>
                <span style={{ fontSize: '11px', color: '#fb923c', fontFamily: 'monospace' }}>
                  {s.count} docs · {s.chunks} chunks
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent queries */}
      {stats.recent_queries.length > 0 && (
        <div style={{
          background: '#0a0a14',
          border: '1px solid #1a1a2e',
          borderRadius: '10px',
          padding: '12px'
        }}>
          <div style={{
            fontSize: '10px', color: '#4ade80',
            fontFamily: 'monospace', marginBottom: '12px'
          }}>
            // RECENT QUERIES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stats.recent_queries.slice(0, 8).map((q, i) => (
              <div key={i} style={{
                padding: '6px 10px',
                background: '#080810',
                borderRadius: '6px',
                borderLeft: '2px solid #4ade80'
              }}>
                <div style={{
                  fontSize: '11px', color: '#ccc',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {q.query}
                </div>
                <div style={{
                  fontSize: '9px', color: '#444',
                  fontFamily: 'monospace', marginTop: '2px'
                }}>
                  {q.timestamp?.slice(0, 16).replace('T', ' ')} · {q.sources_used} sources · {q.response_time_ms}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total_queries === 0 && (
        <div style={{
          textAlign: 'center', padding: '20px',
          color: '#333', fontSize: '12px', lineHeight: '2'
        }}>
          No queries yet.<br />
          Start chatting to see analytics!
        </div>
      )}
    </div>
  )
}