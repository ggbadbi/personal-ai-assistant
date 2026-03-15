import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, CartesianGrid
} from 'recharts'

const api = axios.create({ baseURL: 'http://localhost:8000' })

const TEAL = '#00d4e0'
const SEAFOAM = '#7fffd4'
const CORAL = '#ff6b6b'
const GOLD = '#ffd700'
const PURPLE = '#a78bfa'
const OCEAN = '#0d7377'

const DONUT_COLORS = [TEAL, SEAFOAM, CORAL, GOLD, PURPLE, '#fb923c']

const cardStyle = {
  background: 'rgba(7,30,51,0.8)',
  border: '1px solid rgba(20,168,173,0.2)',
  borderRadius: '14px',
  padding: '18px',
  backdropFilter: 'blur(10px)',
  marginBottom: '14px'
}

const sectionLabel = (text, color = TEAL) => (
  <div style={{
    fontSize: '9px', letterSpacing: '3px', color,
    fontFamily: 'JetBrains Mono', marginBottom: '14px',
    display: 'flex', alignItems: 'center', gap: '8px'
  }}>
    <div style={{ width: '20px', height: '1px', background: color, opacity: 0.5 }} />
    {text}
    <div style={{ flex: 1, height: '1px', background: color, opacity: 0.1 }} />
  </div>
)

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(4,20,36,0.95)', border: '1px solid rgba(0,212,224,0.3)',
      borderRadius: '8px', padding: '10px 14px', fontFamily: 'JetBrains Mono', fontSize: '11px'
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || TEAL }}>
          {p.name}: <strong>{p.value}{unit}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeDonut, setActiveDonut] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/analytics')
        setStats(res.data)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ color: TEAL, fontFamily: 'JetBrains Mono', fontSize: '11px', letterSpacing: '2px' }}>
        LOADING ANALYTICS...
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: TEAL, animation: `wave 1.2s ${i*0.2}s ease-in-out infinite`
          }} />
        ))}
      </div>
      <style>{`@keyframes wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  )

  if (!stats) return (
    <div style={{ padding: '20px', color: CORAL, fontSize: '12px', fontFamily: 'JetBrains Mono' }}>
      FAILED TO LOAD
    </div>
  )

  // Prepare donut data
  const donutData = stats.by_source_type?.map((s, i) => ({
    name: s.source_type,
    value: s.count,
    chunks: s.chunks,
    color: DONUT_COLORS[i % DONUT_COLORS.length]
  })) || []

  // Prepare response time data — last 10 queries
  const rtData = stats.recent_queries?.slice(0, 10).reverse().map((q, i) => ({
    name: `Q${i + 1}`,
    ms: q.response_time_ms,
    label: q.query?.slice(0, 20) + '...'
  })) || []

  // Most queried docs — count source appearances in recent queries
  const docCounts = {}
  stats.recent_queries?.forEach(q => {
    // We don't have per-query source data so use ingestion data
  })
  const docRanking = stats.by_source_type?.map(s => ({
    name: s.source_type,
    queries: s.count,
    chunks: s.chunks || 0
  })) || []

  const hasData = stats.total_queries > 0

  return (
    <div style={{ padding: '16px', overflowY: 'auto' }}>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: 'Total Queries', value: stats.total_queries, color: TEAL, icon: '💬' },
          { label: 'Today', value: stats.queries_today, color: SEAFOAM, icon: '📅' },
          { label: 'This Week', value: stats.queries_week, color: PURPLE, icon: '📊' },
          { label: 'Docs Ingested', value: stats.total_docs_ingested, color: GOLD, icon: '📚' },
        ].map((s, i) => (
          <div key={i} style={{
            background: `linear-gradient(135deg, rgba(7,30,51,0.9), rgba(7,30,51,0.6))`,
            border: `1px solid rgba(${s.color === TEAL ? '0,212,224' : s.color === SEAFOAM ? '127,255,212' : s.color === PURPLE ? '167,139,250' : '255,215,0'},0.2)`,
            borderRadius: '12px', padding: '14px',
            textAlign: 'center',
            boxShadow: `0 4px 20px rgba(${s.color === TEAL ? '0,212,224' : '0,0,0'},0.08)`
          }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{
              fontSize: '26px', fontWeight: 800, color: s.color,
              fontFamily: 'JetBrains Mono',
              textShadow: `0 0 20px ${s.color}44`
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: '3px' }}>
              {s.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {!hasData && (
        <div style={{
          ...cardStyle, textAlign: 'center', padding: '32px',
          color: 'var(--text-muted)', fontSize: '12px',
          fontFamily: 'JetBrains Mono'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌊</div>
          START CHATTING TO SEE ANALYTICS
        </div>
      )}

      {/* Line chart — queries over time */}
      {stats.daily_activity?.length > 0 && (
        <div style={cardStyle}>
          {sectionLabel('QUERIES OVER TIME', TEAL)}
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={stats.daily_activity} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,168,173,0.08)" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#3a6278', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickFormatter={v => v.slice(5)}
                axisLine={{ stroke: 'rgba(20,168,173,0.2)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#3a6278', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="count" name="Queries"
                stroke={TEAL} strokeWidth={2} dot={{ fill: TEAL, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: TEAL, boxShadow: `0 0 8px ${TEAL}` }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Response time trends */}
      {rtData.length > 0 && (
        <div style={cardStyle}>
          {sectionLabel('RESPONSE TIME TRENDS', CORAL)}
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={rtData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,107,107,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#3a6278', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'rgba(255,107,107,0.2)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#3a6278', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip unit="ms" />} />
              <Bar dataKey="ms" name="Response" radius={[4, 4, 0, 0]}>
                {rtData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`rgba(255,107,107,${0.4 + (i / rtData.length) * 0.6})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {rtData.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                avg: {Math.round(rtData.reduce((a, b) => a + b.ms, 0) / rtData.length)}ms
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                max: {Math.max(...rtData.map(d => d.ms))}ms
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top topics leaderboard */}
      {stats.top_topics?.length > 0 && (
        <div style={cardStyle}>
          {sectionLabel('TOP TOPICS LEADERBOARD', GOLD)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.top_topics.map((t, i) => {
              const maxCount = stats.top_topics[0].count
              const pct = (t.count / maxCount) * 100
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: i < 3 ? '14px' : '11px', minWidth: '22px', fontFamily: 'JetBrains Mono', color: 'var(--text-muted)' }}>
                    {medal}
                  </span>
                  <span style={{ minWidth: '70px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono' }}>
                    {t.word}
                  </span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: `linear-gradient(90deg, ${GOLD}, ${SEAFOAM})`,
                      borderRadius: '3px',
                      boxShadow: `0 0 6px ${GOLD}44`,
                      transition: 'width 0.8s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', minWidth: '20px', textAlign: 'right' }}>
                    {t.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Donut chart — sources by type */}
      {donutData.length > 0 && (
        <div style={cardStyle}>
          {sectionLabel('KNOWLEDGE SOURCES BREAKDOWN', SEAFOAM)}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ResponsiveContainer width="55%" height={160}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, i) => setActiveDonut(i)}
                  onMouseLeave={() => setActiveDonut(null)}
                >
                  {donutData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={activeDonut === null || activeDonut === i ? 1 : 0.4}
                      style={{ cursor: 'pointer', filter: activeDonut === i ? `drop-shadow(0 0 6px ${entry.color})` : 'none' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div style={{ background: 'rgba(4,20,36,0.95)', border: `1px solid ${d.color}44`, borderRadius: '8px', padding: '10px 14px', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
                        <div style={{ color: d.color, fontWeight: 600 }}>{d.name}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{d.value} docs · {d.chunks} chunks</div>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {donutData.map((d, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  opacity: activeDonut === null || activeDonut === i ? 1 : 0.4,
                  transition: 'opacity 0.2s'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, flexShrink: 0, boxShadow: `0 0 4px ${d.color}88` }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', flex: 1 }}>
                    {d.name}
                  </span>
                  <span style={{ fontSize: '10px', color: d.color, fontFamily: 'JetBrains Mono' }}>
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total chunks by type */}
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{d.name}</span>
                <span style={{ fontSize: '10px', color: d.color, fontFamily: 'JetBrains Mono' }}>{d.chunks} chunks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most queried documents */}
      {stats.recent_queries?.length > 0 && (
        <div style={cardStyle}>
          {sectionLabel('RECENT QUERY LOG', PURPLE)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stats.recent_queries.slice(0, 8).map((q, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                background: 'rgba(167,139,250,0.04)',
                border: '1px solid rgba(167,139,250,0.1)',
                borderLeft: `2px solid ${PURPLE}`,
                borderRadius: '8px',
                transition: 'all 0.15s'
              }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(167,139,250,0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(167,139,250,0.04)'}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                  {q.query}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    {q.timestamp?.slice(0, 16).replace('T', ' ')}
                  </span>
                  <span style={{ fontSize: '9px', color: PURPLE, fontFamily: 'JetBrains Mono' }}>
                    {q.sources_used} src
                  </span>
                  <span style={{ fontSize: '9px', color: q.response_time_ms > 5000 ? CORAL : SEAFOAM, fontFamily: 'JetBrains Mono' }}>
                    {q.response_time_ms}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes wave { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
    </div>
  )
}