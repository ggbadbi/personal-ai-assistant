import { useState, useCallback } from 'react'
import { sendMessage } from '../api/client'

const SESSION_ID = 'session_' + Math.random().toString(36).slice(2, 9)

export function useChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your Personal AI Assistant. Upload documents using the panel on the left — then ask me anything about your knowledge base.",
      sources: []
    }
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return

    setMessages(prev => [...prev, { role: 'user', content: text, sources: [] }])
    setLoading(true)
    setError(null)

    try {
      const res = await sendMessage(text, SESSION_ID)
      const data = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        chunks_used: data.chunks_used
      }])
    } catch (e) {
      setError('Failed to get response.')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error connecting to backend. Make sure uvicorn is running on port 8000.',
        sources: []
      }])
    } finally {
      setLoading(false)
    }
  }, [loading])

  return { messages, loading, error, send }
}