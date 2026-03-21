import { useState, useEffect } from 'react'
import axios from 'axios'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import LoginScreen from './components/LoginScreen'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [authenticated, setAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [sessionToken, setSessionToken] = useState('')

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    if (window.innerWidth >= 768) setSidebarOpen(true)
    return () => window.removeEventListener('resize', handle)
  }, [])

  // Check if password is required
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/status')
        if (!res.data.requires_login) {
          setAuthenticated(true)
        } else {
          // Check saved token
          const saved = localStorage.getItem('ai_session_token')
          if (saved) {
            setAuthenticated(true)
            setSessionToken(saved)
          }
        }
      } catch {
        setAuthenticated(true) // If auth endpoint fails, allow through
      }
      setAuthChecked(true)
    }
    checkAuth()
  }, [])

  const handleLogin = (token) => {
    setSessionToken(token)
    setAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('ai_session_token')
    setAuthenticated(false)
    setSessionToken('')
  }

  if (!authChecked) return (
    <div style={{ height: '100vh', background: 'var(--ocean-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--teal)', fontFamily: 'JetBrains Mono', fontSize: '12px' }}>Loading...</div>
    </div>
  )

  if (!authenticated) return <LoginScreen onLogin={handleLogin} />

  return (
    <div style={{
      display: 'flex', height: '100vh',
      overflow: 'hidden', minHeight: 0,
      background: 'var(--ocean-deep)',
      position: 'relative'
    }}>
      {/* Animated background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            background: `radial-gradient(circle, rgba(0,212,224,${0.03 + i * 0.01}) 0%, transparent 70%)`,
            width: `${200 + i * 100}px`, height: `${200 + i * 100}px`,
            left: `${(i * 17) % 100}%`, top: `${(i * 23) % 100}%`,
            animation: `float ${8 + i * 3}s ease-in-out infinite`,
            animationDelay: `${i * 1.5}s`
          }} />
        ))}
      </div>

      <style>{`@keyframes float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-30px) scale(1.05)}}`}</style>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 10,
          background: 'rgba(2,13,26,0.7)', backdropFilter: 'blur(4px)'
        }} />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? 0 : '-320px') : 0,
        top: 0, bottom: 0, zIndex: isMobile ? 20 : 1,
        transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0
      }}>
        {(sidebarOpen || !isMobile) && (
          <Sidebar
            onClose={() => setSidebarOpen(false)}
            isMobile={isMobile}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '10px 14px' : '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(4,20,36,0.8)', backdropFilter: 'blur(20px)',
          flexShrink: 0
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: sidebarOpen && !isMobile ? 'rgba(0,212,224,0.1)' : 'none',
            border: '1px solid var(--border)', borderRadius: '8px',
            padding: '7px 10px', color: 'var(--teal)', cursor: 'pointer',
            fontSize: '16px', flexShrink: 0, lineHeight: 1
          }}>
            {sidebarOpen && !isMobile ? '✕' : '☰'}
          </button>

          <div style={{
            width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px',
            borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--teal-deep), var(--teal-bright))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isMobile ? '14px' : '18px',
            boxShadow: '0 0 15px rgba(0,212,224,0.3)'
          }}>🧠</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? '13px' : '15px', fontWeight: 700,
              background: 'linear-gradient(90deg, var(--teal-bright), var(--seafoam))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              Neural Knowledge Base
            </div>
            {!isMobile && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                DeepSeek-R1 14B · RTX 4080 · 100% local
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
            {!isMobile && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>ONLINE</span>}
            {/* Logout button */}
            <button onClick={handleLogout} title="Logout" style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '4px 8px',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px',
              fontFamily: 'JetBrains Mono'
            }}>
              🚪
            </button>
          </div>
        </div>

        <ChatWindow isMobile={isMobile} />
      </div>
    </div>
  )
}