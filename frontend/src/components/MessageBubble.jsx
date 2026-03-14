import ReactMarkdown from 'react-markdown'
import { useState } from 'react'

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '16px'
    }}>
      <div style={{
        fontSize: '10px',
        color: '#555',
        marginBottom: '4px',
        fontFamily: 'monospace',
        letterSpacing: '1px'
      }}>
        {isUser ? 'YOU' : 'AI ASSISTANT'}
      </div>

      <div style={{
        maxWidth: '75%',
        padding: '12px 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? '#1a3a5c' : '#12121e',
        border: isUser ? '1px solid #2a5a8c' : '1px solid #1e1e2e',
        color: '#e0e0f0',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {message.sources && message.sources.length > 0 && (
        <div style={{ maxWidth: '75%', marginTop: '6px' }}>
          <button
            onClick={() => setShowSources(!showSources)}
            style={{
              background: 'none',
              border: '1px solid #252535',
              borderRadius: '6px',
              padding: '3px 10px',
              color: '#60a5fa',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            {showSources ? '▲' : '▼'} {message.sources.length} source{message.sources.length > 1 ? 's' : ''} used
          </button>

          {showSources && (
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {message.sources.map((src, i) => (
                <div key={i} style={{
                  background: '#0a0a14',
                  border: '1px solid #1a1a2e',
                  borderLeft: '3px solid #60a5fa',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '11px'
                }}>
                  <div style={{ color: '#60a5fa', fontFamily: 'monospace', marginBottom: '3px' }}>
                    📄 {src.source} · {src.type} · score: {src.score}
                  </div>
                  <div style={{ color: '#666', lineHeight: '1.4' }}>{src.snippet}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}