import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { useChat } from '../hooks/useChat'

export default function ChatWindow() {
  const { messages, loading, send } = useChat()
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    send(text)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Voice not supported. Use Chrome or Edge.')
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const r = new SR()
    r.continuous = false
    r.interimResults = false
    r.lang = 'en-US'

    r.onstart = () => setListening(true)

    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      console.log('Voice:', transcript)
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
      setListening(false)
    }

    r.onerror = (e) => {
      console.error('Voice error:', e.error)
      setListening(false)
      if (e.error === 'not-allowed') {
        alert('Mic blocked.\n\n1. Click the lock icon in address bar\n2. Set Microphone to Allow\n3. Refresh the page')
      }
    }

    r.onend = () => setListening(false)

    recognitionRef.current = r
    try { r.start() } catch(err) { setListening(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '24px 20px',
        scrollbarWidth: 'thin', scrollbarColor: '#1e1e2e transparent'
      }}>
        {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', color: '#555', fontSize: '13px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#60a5fa',
                  animation: `bounce 1s ${i*0.2}s infinite`
                }} />
              ))}
            </div>
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Listening bar */}
      {listening && (
        <div style={{
          margin: '0 20px 8px', padding: '10px 16px',
          background: '#1a0a0a', border: '1px solid #3a1a1a',
          borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#f87171', animation: 'pulse 1s infinite'
          }} />
          <span style={{ fontSize: '13px', color: '#f87171' }}>
            Listening... speak now, then click mic to stop
          </span>
        </div>
      )}

      {/* Input bar */}
      <div style={{
        padding: '16px 20px', borderTop: '1px solid #1a1a2e',
        display: 'flex', gap: '10px',
        background: '#080810', alignItems: 'flex-end'
      }}>
        <button
          onClick={startVoice}
          title={listening ? 'Click to stop listening' : 'Click to speak'}
          style={{
            background: listening ? '#2a0a0a' : '#0f0f1a',
            border: `1px solid ${listening ? '#f87171' : '#252535'}`,
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '18px', cursor: 'pointer', flexShrink: 0
          }}
        >
          {listening ? '⏹️' : '🎙️'}
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything... (Enter to send, click 🎙️ to speak)"
          rows={2}
          disabled={loading}
          style={{
            flex: 1, background: loading ? '#0a0a12' : '#0f0f1a',
            border: '1px solid #1e1e2e', borderRadius: '10px',
            padding: '10px 14px', color: '#e0e0f0',
            fontSize: '14px', resize: 'none', outline: 'none',
            fontFamily: 'inherit', lineHeight: '1.5'
          }}
        />

        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: (loading || !input.trim()) ? '#1a1a2e' : '#1a3a5c',
            border: '1px solid #2a5a8c', borderRadius: '10px',
            padding: '10px 20px',
            color: (loading || !input.trim()) ? '#555' : '#60a5fa',
            fontSize: '20px', cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', flexShrink: 0
          }}
        >
          ➤
        </button>
      </div>

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}