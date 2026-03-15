import { useState, useCallback, useRef } from 'react'
import { sendMessage } from '../api/client'

export function useChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your Personal AI Assistant. Upload documents using the panel on the left — then ask me anything about your knowledge base.",
      sources: [],
      id: 0
    }
  ])
  const [loading, setLoading] = useState(false)
  const sessionId = useRef('session_' + Math.random().toString(36).slice(2, 9))
  const msgCounter = useRef(1)

  const send = useCallback(async (text, editFromIndex = null) => {
    if (!text || !text.trim() || loading) return

    const userMsg = {
      role: 'user',
      content: text,
      sources: [],
      id: msgCounter.current++
    }

    // If editing — remove all messages from that index onwards
    if (editFromIndex !== null) {
      setMessages(prev => [...prev.slice(0, editFromIndex), userMsg])
    } else {
      setMessages(prev => [...prev, userMsg])
    }

    setLoading(true)

    try {
      const res = await sendMessage(text, sessionId.current)
      const data = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || 'No response',
        sources: data.sources || [],
        chunks_used: data.chunks_used,
        id: msgCounter.current++
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error: ' + (e.response?.data?.detail || e.message),
        sources: [],
        id: msgCounter.current++
      }])
    } finally {
      setLoading(false)
    }
  }, [loading])

  const clearChat = useCallback(() => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared. Ask me anything about your knowledge base!",
      sources: [],
      id: msgCounter.current++
    }])
  }, [])

  return { messages, loading, send, clearChat }
}