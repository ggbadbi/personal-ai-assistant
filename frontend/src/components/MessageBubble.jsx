import ReactMarkdown from 'react-markdown'
import { useState } from 'react'

export default function MessageBubble({ message, onEdit, onPin, highlight }) {
  const [showSources, setShowSources] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isUser = message.role === 'user'

  const highlightText = (text) => {
    if (!highlight || !text) return text
    const idx = text.toLowerCase().indexOf(highlight.toLowerCase())
    if (idx === -1) return text
    return text.slice(0, idx) + '**' + text.slice(idx, idx + highlight.length) + '**' + text.slice(idx + highlight.length)
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Role + actions */}
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px', fontFamily: 'JetBrains Mono', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isUser ? 'YOU' : '🌊 NEURAL BASE'}
        {hovered && isUser && onEdit && (
          <button onClick={onEdit} style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '4px', padding: '1px 8px', color: 'var(--gold)', fontSize: '10px', cursor: 'pointer' }}>
            edit
          </button>
        )}
        {hovered && !isUser && onPin && (
          <button onClick={onPin} style={{ background: 'rgba(0,212,224,0.1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 8px', color: 'var(--teal-bright)', fontSize: '10px', cursor: 'pointer' }}>
            📌 pin
          </button>
        )}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '78%', padding: '13px 17px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        background: isUser
          ? 'linear-gradient(135deg, rgba(13,115,119,0.4), rgba(0,212,224,0.15))'
          : 'rgba(7,30,51,0.8)',
        border: isUser
          ? '1px solid rgba(0,212,224,0.3)'
          : '1px solid var(--border)',
        color: 'var(--text-primary)',
        fontSize: '14px', lineHeight: '1.7',
        boxShadow: isUser ? '0 4px 20px rgba(0,212,224,0.1)' : '0 4px 20px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <ReactMarkdown>{highlightText(message.content)}</ReactMarkdown>
      </div>

      {/* Sources */}
      {message.sources && message.sources.length > 0 && (
        <div style={{ maxWidth: '78%', marginTop: '8px' }}>
          <button onClick={() => setShowSources(!showSources)} style={{
            background: 'rgba(0,212,224,0.05)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '4px 12px',
            color: 'var(--teal)', fontSize: '11px', cursor: 'pointer',
            fontFamily: 'JetBrains Mono', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span style={{ fontSize: '8px' }}>{showSources ? '\u25BC' : '\u25B6'}</span>
            {message.sources.length} source{message.sources.length > 1 ? 's' : ''} · {message.chunks_used || message.sources.length} chunks
          </button>

          {showSources && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {message.sources.map((src, i) => {
                const isYT = src.type === 'youtube'
                const isWeb = src.type === 'webpage'
                const icon = isYT ? '\uD83D\uDCFA' : isWeb ? '\uD83C\uDF10' : '\uD83D\uDCC4'
                const glowColor = isYT ? 'rgba(255,107,107,0.2)' : isWeb ? 'rgba(127,255,212,0.2)' : 'rgba(0,212,224,0.2)'
                const borderColor = isYT ? '#f87171' : isWeb ? 'var(--seafoam)' : 'var(--teal-bright)'
                return (
                  <div key={i} style={{
                    background: 'rgba(7,30,51,0.9)', backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border)', borderLeft: '3px solid ' + borderColor,
                    borderRadius: '8px', padding: '10px 12px', fontSize: '11px',
                    boxShadow: '0 2px 10px ' + glowColor
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{icon}</span>
                      <span style={{ color: borderColor, fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '11px' }}>{src.source.slice(0, 40)}{src.source.length > 40 ? '...' : ''}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{src.type} \u00B7 {src.score}</span>
                      {isYT && src.timestamp && src.timestamp_url && (
                        <a href={src.timestamp_url} target="_blank" rel="noopener noreferrer" style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          color: 'var(--gold)', textDecoration: 'none',
                          background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)',
                          borderRadius: '6px', padding: '2px 8px',
                          fontSize: '10px', fontFamily: 'JetBrains Mono'
                        }}>
                          {'\u25B6'} {src.timestamp}
                        </a>
                      )}
                      {isYT && src.channel && <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontStyle: 'italic' }}>{src.channel}</span>}
                    </div>
                    <div style={{ color: 'var(--text-muted)', lineHeight: '1.5', borderTop: '1px solid var(--border)', paddingTop: '6px', fontSize: '11px' }}>
                      {src.snippet}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
