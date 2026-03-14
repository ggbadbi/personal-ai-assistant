import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { useChat } from '../hooks/useChat'

export default function ChatWindow() {
  const { messages, loading, send } = useChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = () => {
    if (!input.trim()) return
    send(input)
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 20px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#1e1e2e transparent'
      }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
            color: '#555',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px',
                  borderRadius: '50%',
                  background: '#60a5fa',
                  animation: `bounce 1s ${i * 0.2}s infinite`
                }} />
              ))}
            </div>
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #1a1a2e',
        display: 'flex',
        gap: '10px',
        background: '#080810'
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your knowledge base... (Enter to send)"
          rows={2}
          style={{
            flex: 1,
            background: '#0f0f1a',
            border: '1px solid #1e1e2e',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#e0e0f0',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5'
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: loading ? '#1a1a2e' : '#1a3a5c',
            border: '1px solid #2a5a8c',
            borderRadius: '10px',
            padding: '0 20px',
            color: loading ? '#555' : '#60a5fa',
            fontSize: '20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ➤
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}