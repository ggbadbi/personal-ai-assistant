import { useState, useCallback, useRef } from 'react'
import { sendMessage } from '../api/client'

export function useChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your Personal AI Assistant. Upload documents using the panel on the left — then ask me anything about your knowledge base.",
      sources: []
    }
  ])
  const [loading, setLoading] = useState(false)
  const sessionId = useRef('session_' + Math.random().toString(36).slice(2, 9))

  const send = useCallback(async (text) => {
    if (!text || !text.trim() || loading) return

    const userMsg = { role: 'user', content: text, sources: [] }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await sendMessage(text, sessionId.current)
      const data = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || 'No response',
        sources: data.sources || [],
        chunks_used: data.chunks_used
      }])
    } catch (e) {
      console.error('Chat error:', e)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error: ' + (e.response?.data?.detail || e.message),
        sources: []
      }])
    } finally {
      setLoading(false)
    }
  }, [loading])

  return { messages, loading, send }
}