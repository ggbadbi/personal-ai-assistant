content = r"""import ReactMarkdown from 'react-markdown'
import { useState } from 'react'

export default function MessageBubble({ message, onEdit }) {
  const [showSources, setShowSources] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: '16px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px', fontFamily: 'monospace', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isUser ? 'YOU' : 'AI ASSISTANT'}
        {isUser && onEdit && hovered && (
          <button
            onClick={onEdit}
            style={{ background: 'none', border: '1px solid #2a2a1a', borderRadius: '4px', padding: '1px 7px', color: '#fbbf24', fontSize: '10px', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            edit
          </button>
        )}
      </div>

      <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isUser ? '#1a3a5c' : '#12121e', border: isUser ? '1px solid #2a5a8c' : '1px solid #1e1e2e', color: '#e0e0f0', fontSize: '14px', lineHeight: '1.6' }}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {message.sources && message.sources.length > 0 && (
        <div style={{ maxWidth: '80%', marginTop: '6px' }}>
          <button onClick={() => setShowSources(!showSources)} style={{ background: 'none', border: '1px solid #252535', borderRadius: '6px', padding: '3px 10px', color: '#60a5fa', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}>
            {showSources ? '\u25B2' : '\u25BC'} {message.sources.length} source{message.sources.length > 1 ? 's' : ''} used
          </button>

          {showSources && (
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {message.sources.map((src, i) => {
                const isYT = src.type === 'youtube'
                const isWeb = src.type === 'webpage'
                const icon = isYT ? '\uD83D\uDCFA' : isWeb ? '\uD83C\uDF10' : '\uD83D\uDCC4'
                const borderColor = isYT ? '#f87171' : isWeb ? '#4ade80' : '#60a5fa'
                return (
                  <div key={i} style={{ background: '#0a0a14', border: '1px solid #1a1a2e', borderLeft: '3px solid ' + borderColor, borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px' }}>{icon}</span>
                      <span style={{ color: borderColor, fontFamily: 'monospace', fontWeight: 600 }}>{src.source}</span>
                      <span style={{ color: '#444', fontSize: '10px' }}>{src.type} \u00B7 score: {src.score}</span>
                      {isYT && src.timestamp && src.timestamp_url && (
                        <a href={src.timestamp_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#fbbf24', textDecoration: 'none', background: '#1a1200', border: '1px solid #3a2800', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer' }}>
                          {'\u25B6'} {src.timestamp}
                        </a>
                      )}
                      {isYT && src.channel && (
                        <span style={{ color: '#555', fontSize: '10px', fontStyle: 'italic' }}>{src.channel}</span>
                      )}
                    </div>
                    <div style={{ color: '#666', lineHeight: '1.5', borderTop: '1px solid #13131f', paddingTop: '5px' }}>{src.snippet}</div>
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
"""

with open("frontend/src/components/MessageBubble.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")