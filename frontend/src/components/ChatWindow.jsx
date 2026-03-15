import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { useChat } from '../hooks/useChat'

export default function ChatWindow() {
  const { messages, loading, send, clearChat } = useChat()
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    if (editingIndex !== null) {
      send(text, editingIndex)
      setEditingIndex(null)
    } else {
      send(text)
    }
    setInput('')
    inputRef.current?.focus()
  }

  const handleEdit = (index, content) => {
    setEditingIndex(index)
    setInput(content)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && editingIndex !== null) {
      cancelEdit()
    }
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Use Edge for voice input.'); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }

    const r = new SR()
    r.continuous = false
    r.interimResults = false
    r.lang = 'en-US'
    r.onstart = () => setListening(true)
    r.onresult = (e) => {
      const t = e.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + t : t)
      setListening(false)
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    recognitionRef.current = r
    try { r.start() } catch { setListening(false) }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* Top bar */}
      <div style={{
        padding: '8px 20px',
        borderBottom: '1px solid #0f0f1a',
        display: 'flex',
        justifyContent: 'flex-end',
        flexShrink: 0
      }}>
        <button
          onClick={clearChat}
          style={{
            background: 'none', border: '1px solid #1a1a2e',
            borderRadius: '6px', padding: '4px 12px',
            color: '#555', fontSize: '11px',
            cursor: 'pointer', fontFamily: 'monospace'
          }}
        >
          🗑 clear chat
        </button>
      </div>

      {/* Messages — flex: 1 + minHeight: 0 is the key fix */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '24px 20px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#1e1e2e transparent'
      }}>
        {messages.map((msg, i) => (
          <div key={msg.id || i}>
            <MessageBubble
              message={msg}
              onEdit={msg.role === 'user' ? () => handleEdit(i, msg.content) : null}
            />
          </div>
        ))}

        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: '8px', padding: '8px 0',
            color: '#555', fontSize: '13px'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
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

      {/* Edit indicator */}
      {editingIndex !== null && (
        <div style={{
          margin: '0 20px 6px',
          padding: '8px 12px',
          background: '#1a1a08',
          border: '1px solid #3a3010',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '8px',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '12px', color: '#fbbf24' }}>
            ✏️ Editing — Enter to resend · Esc to cancel
          </span>
          <button onClick={cancelEdit} style={{
            marginLeft: 'auto', background: 'none',
            border: '1px solid #3a3010', borderRadius: '4px',
            padding: '2px 8px', color: '#fbbf24',
            fontSize: '11px', cursor: 'pointer'
          }}>
            Cancel
          </button>
        </div>
      )}

      {/* Listening bar */}
      {listening && (
        <div style={{
          margin: '0 20px 8px', padding: '10px 16px',
          background: '#1a0a0a', border: '1px solid #3a1a1a',
          borderRadius: '10px', display: 'flex', alignItems: 'center',
          gap: '10px', flexShrink: 0
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#f87171', animation: 'pulse 1s infinite'
          }} />
          <span style={{ fontSize: '13px', color: '#f87171' }}>
            Listening... click mic to stop
          </span>
        </div>
      )}

      {/* Input bar — flexShrink: 0 prevents it from being squished */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #1a1a2e',
        display: 'flex', gap: '10px',
        background: '#080810',
        alignItems: 'flex-end',
        flexShrink: 0
      }}>
        <button
          onClick={startVoice}
          title="Voice input (Edge browser)"
          style={{
            background: listening ? '#2a0a0a' : '#0f0f1a',
            border: `1px solid ${listening ? '#f87171' : '#252535'}`,
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '18px', cursor: 'pointer', flexShrink: 0,
            lineHeight: 1
          }}
        >
          {listening ? '⏹' : '🎙'}
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            editingIndex !== null
              ? 'Edit your message... (Enter to resend, Esc to cancel)'
              : 'Ask anything... (Enter to send, Shift+Enter for newline)'
          }
          rows={2}
          disabled={loading}
          style={{
            flex: 1,
            background: editingIndex !== null ? '#1a1a08' : (loading ? '#0a0a12' : '#0f0f1a'),
            border: `1px solid ${editingIndex !== null ? '#3a3010' : '#1e1e2e'}`,
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#e0e0f0',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            cursor: loading ? 'not-allowed' : 'text'
          }}
        />

        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: (loading || !input.trim())
              ? '#1a1a2e'
              : editingIndex !== null ? '#2a2a08' : '#1a3a5c',
            border: `1px solid ${editingIndex !== null ? '#3a3010' : '#2a5a8c'}`,
            borderRadius: '10px',
            padding: '10px 20px',
            color: (loading || !input.trim())
              ? '#555'
              : editingIndex !== null ? '#fbbf24' : '#60a5fa',
            fontSize: '20px',
            cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
            lineHeight: 1
          }}
        >
          {editingIndex !== null ? '✏' : '➤'}
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}