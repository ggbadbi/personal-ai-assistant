import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { useChat } from '../hooks/useChat'

export default function ChatWindow({ isMobile = false }) {
  const { messages, loading, send, clearChat, pinnedMessages, pinMessage, sessions, saveSession, loadSession } = useChat()
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [showPinned, setShowPinned] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!searchQuery) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, searchQuery])

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    if (editingIndex !== null) { send(text, editingIndex); setEditingIndex(null) }
    else send(text)
    setInput('')
    inputRef.current?.focus()
  }

  const handleEdit = (index, content) => {
    setEditingIndex(index); setInput(content)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 50)
  }

  const cancelEdit = () => { setEditingIndex(null); setInput('') }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') { cancelEdit(); setSearchOpen(false) }
  }

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text('Knowledge Base Chat Export', 20, 20)
      doc.setFontSize(10)
      let y = 35
      messages.forEach((msg) => {
        if (y > 270) { doc.addPage(); y = 20 }
        const role = msg.role === 'user' ? 'YOU' : 'AI'
        doc.setFont(undefined, 'bold')
        doc.text(role + ':', 20, y)
        doc.setFont(undefined, 'normal')
        const lines = doc.splitTextToSize(msg.content, 160)
        lines.forEach(line => { if (y > 270) { doc.addPage(); y = 20 } doc.text(line, 30, y); y += 6 })
        y += 4
      })
      doc.save(`chat-export-${Date.now()}.pdf`)
    } catch (e) { alert('PDF export failed: ' + e.message) }
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Use Edge for voice input.'); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const r = new SR()
    r.continuous = false; r.interimResults = false; r.lang = 'en-US'
    r.onstart = () => setListening(true)
    r.onresult = (e) => { setInput(prev => prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript); setListening(false) }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    recognitionRef.current = r
    try { r.start() } catch { setListening(false) }
  }

  const btnStyle = (active) => ({
    background: active ? 'rgba(0,212,224,0.15)' : 'rgba(7,30,51,0.8)',
    border: `1px solid ${active ? 'var(--teal-bright)' : 'var(--border)'}`,
    borderRadius: '10px', padding: isMobile ? '7px 9px' : '8px 12px',
    color: active ? 'var(--teal-bright)' : 'var(--text-muted)',
    fontSize: isMobile ? '14px' : '13px', cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '4px',
    whiteSpace: 'nowrap'
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        padding: isMobile ? '6px 10px' : '8px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', gap: '4px', alignItems: 'center',
        background: 'rgba(4,20,36,0.6)', backdropFilter: 'blur(10px)',
        flexShrink: 0, overflowX: 'auto'
      }}>
        <button onClick={() => setSearchOpen(!searchOpen)} style={btnStyle(searchOpen)}>
          🔍{!isMobile && <span style={{ fontSize: '11px' }}>Search</span>}
        </button>
        <button onClick={() => setShowPinned(!showPinned)} style={btnStyle(showPinned)}>
          📌{!isMobile && <span style={{ fontSize: '11px' }}>Pinned{pinnedMessages.length > 0 ? ` (${pinnedMessages.length})` : ''}</span>}
        </button>
        <button onClick={() => setSessionModalOpen(true)} style={btnStyle(false)}>
          🔖{!isMobile && <span style={{ fontSize: '11px' }}>Save</span>}
        </button>
        <button onClick={exportPDF} style={btnStyle(false)}>
          📤{!isMobile && <span style={{ fontSize: '11px' }}>Export</span>}
        </button>
        <button onClick={clearChat} style={{ ...btnStyle(false), marginLeft: 'auto', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.2)' }}>
          🗑{!isMobile && <span style={{ fontSize: '11px' }}>Clear</span>}
        </button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(7,30,51,0.8)', flexShrink: 0 }}>
          <input
            autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            style={{ width: '100%', background: 'rgba(0,212,224,0.05)', border: '1px solid var(--border-bright)', borderRadius: '8px', padding: '8px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'Outfit' }}
          />
          {searchQuery && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'JetBrains Mono' }}>
              {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''} for "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Pinned panel */}
      {showPinned && pinnedMessages.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(0,212,224,0.03)', flexShrink: 0, maxHeight: '200px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', color: 'var(--teal)', fontFamily: 'JetBrains Mono', letterSpacing: '2px', marginBottom: '8px' }}>// PINNED ANSWERS</div>
          {pinnedMessages.map((msg, i) => (
            <div key={i} style={{ padding: '8px 12px', marginBottom: '6px', background: 'rgba(0,212,224,0.05)', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal-bright)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {msg.content.slice(0, 120)}...
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: isMobile ? '16px 12px' : '24px 20px',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--teal-deep) transparent'
      }}>
        {filteredMessages.map((msg, i) => (
          <MessageBubble
            key={msg.id || i} message={msg}
            onEdit={msg.role === 'user' ? () => handleEdit(i, msg.content) : null}
            onPin={msg.role === 'assistant' ? () => pinMessage(msg) : null}
            highlight={searchQuery}
            isMobile={isMobile}
          />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0' }}>
            <div style={{ display: 'flex', gap: '5px', padding: '10px 16px', background: 'rgba(0,212,224,0.05)', border: '1px solid var(--border)', borderRadius: '16px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--teal-bright)', animation: `wave 1.2s ${i*0.2}s ease-in-out infinite` }} />
              ))}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px', fontFamily: 'JetBrains Mono' }}>thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Edit bar */}
      {editingIndex !== null && (
        <div style={{ margin: '0 16px 8px', padding: '8px 14px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: 'var(--gold)' }}>✏️ Editing — Enter to resend · Esc to cancel</span>
          <button onClick={cancelEdit} style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '6px', padding: '2px 10px', color: 'var(--gold)', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* Listening bar */}
      {listening && (
        <div style={{ margin: '0 16px 8px', padding: '10px 16px', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--coral)', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '12px', color: 'var(--coral)', fontFamily: 'JetBrains Mono' }}>● REC — speak now, click mic to stop</span>
        </div>
      )}

      {/* Session modal */}
      {sessionModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(2,13,26,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--ocean-surface)', border: '1px solid var(--border-bright)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', boxShadow: '0 0 40px rgba(0,212,224,0.15)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--teal-bright)' }}>🔖 Save Session</div>
            <input
              autoFocus value={sessionName} onChange={e => setSessionName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { saveSession(sessionName); setSessionModalOpen(false); setSessionName('') } if (e.key === 'Escape') setSessionModalOpen(false) }}
              placeholder="Name this session..."
              style={{ width: '100%', background: 'var(--ocean-light)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', marginBottom: '16px', fontFamily: 'Outfit' }}
            />
            {sessions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'JetBrains Mono' }}>SAVED SESSIONS</div>
                {sessions.map((s, i) => (
                  <div key={i} onClick={() => { loadSession(s); setSessionModalOpen(false) }}
                    style={{ padding: '8px 12px', marginBottom: '4px', background: 'var(--ocean-light)', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    🔖 {s.name} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({s.messages.length} msgs)</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSessionModalOpen(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'Outfit' }}>Cancel</button>
              <button onClick={() => { saveSession(sessionName || 'Session ' + Date.now()); setSessionModalOpen(false); setSessionName('') }} style={{ background: 'linear-gradient(135deg, var(--teal-deep), var(--teal))', border: 'none', borderRadius: '8px', padding: '8px 16px', color: 'white', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div style={{
        padding: isMobile ? '10px 12px' : '14px 16px',
        borderTop: '1px solid var(--border)',
        background: 'rgba(4,20,36,0.9)', backdropFilter: 'blur(20px)',
        flexShrink: 0, display: 'flex', gap: isMobile ? '6px' : '10px', alignItems: 'flex-end'
      }}>
        <button onClick={startVoice} style={{
          background: listening ? 'rgba(255,107,107,0.15)' : 'rgba(7,30,51,0.8)',
          border: `1px solid ${listening ? 'rgba(255,107,107,0.4)' : 'var(--border)'}`,
          borderRadius: '12px', padding: isMobile ? '9px 11px' : '11px 14px',
          fontSize: '18px', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s'
        }}>
          {listening ? '⏹' : '🎙'}
        </button>

        <textarea
          ref={inputRef} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={editingIndex !== null ? 'Edit message...' : 'Ask anything... (Enter to send)'}
          rows={isMobile ? 1 : 2}
          disabled={loading}
          style={{
            flex: 1,
            background: editingIndex !== null ? 'rgba(255,215,0,0.05)' : 'rgba(7,30,51,0.8)',
            border: `1px solid ${editingIndex !== null ? 'rgba(255,215,0,0.3)' : 'var(--border)'}`,
            borderRadius: '12px',
            padding: isMobile ? '9px 12px' : '11px 16px',
            color: 'var(--text-primary)',
            fontSize: isMobile ? '16px' : '14px',
            resize: 'none', outline: 'none',
            fontFamily: 'Outfit', lineHeight: '1.5',
            boxShadow: input ? '0 0 0 1px rgba(0,212,224,0.2)' : 'none'
          }}
        />

        <button onClick={handleSend} disabled={loading || !input.trim()} style={{
          background: (loading || !input.trim()) ? 'rgba(7,30,51,0.5)' : editingIndex !== null ? 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.1))' : 'linear-gradient(135deg, var(--teal-deep), var(--teal-bright))',
          border: `1px solid ${(loading || !input.trim()) ? 'var(--border)' : editingIndex !== null ? 'rgba(255,215,0,0.4)' : 'transparent'}`,
          borderRadius: '12px', padding: isMobile ? '9px 14px' : '11px 20px',
          color: (loading || !input.trim()) ? 'var(--text-muted)' : 'white',
          fontSize: '18px', cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s', flexShrink: 0,
          boxShadow: (!loading && input.trim() && !editingIndex) ? '0 0 15px rgba(0,212,224,0.3)' : 'none'
        }}>
          {editingIndex !== null ? '✏' : '➤'}
        </button>
      </div>

      <style>{`
        @keyframes wave { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
      `}</style>
    </div>
  )
}