import { useState, useCallback, useRef } from 'react'
import { sendMessage } from '../api/client'

export function useChat() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Welcome to your Neural Knowledge Base 🌊\n\nUpload documents, YouTube videos, or URLs — then ask me anything. I'll answer from your personal knowledge with source citations and timestamps.",
    sources: [], id: 0
  }])
  const [loading, setLoading] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chat_sessions') || '[]') } catch { return [] }
  })
  const sessionId = useRef('session_' + Math.random().toString(36).slice(2, 9))
  const msgCounter = useRef(1)

  const send = useCallback(async (text, editFromIndex = null) => {
    if (!text?.trim() || loading) return
    const userMsg = { role: 'user', content: text, sources: [], id: msgCounter.current++ }
    if (editFromIndex !== null) {
      setMessages(prev => [...prev.slice(0, editFromIndex), userMsg])
    } else {
      setMessages(prev => [...prev, userMsg])
    }
    setLoading(true)
    try {
      const res = await sendMessage(text, sessionId.current)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer || 'No response',
        sources: res.data.sources || [],
        chunks_used: res.data.chunks_used,
        id: msgCounter.current++
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ ' + (e.response?.data?.detail || e.message),
        sources: [], id: msgCounter.current++
      }])
    } finally {
      setLoading(false)
    }
  }, [loading])

  const clearChat = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared 🌊 Ask me anything about your knowledge base!',
      sources: [], id: msgCounter.current++
    }])
  }, [])

  const pinMessage = useCallback((msg) => {
    setPinnedMessages(prev => {
      const exists = prev.find(m => m.id === msg.id)
      if (exists) return prev.filter(m => m.id !== msg.id)
      return [...prev, msg]
    })
  }, [])

  const saveSession = useCallback((name) => {
    const session = { name, messages, timestamp: Date.now(), id: Date.now() }
    setSessions(prev => {
      const updated = [...prev, session]
      try { localStorage.setItem('chat_sessions', JSON.stringify(updated.slice(-10))) } catch {}
      return updated
    })
  }, [messages])

  const loadSession = useCallback((session) => {
    setMessages(session.messages)
  }, [])

  return { messages, loading, send, clearChat, pinnedMessages, pinMessage, sessions, saveSession, loadSession }
}