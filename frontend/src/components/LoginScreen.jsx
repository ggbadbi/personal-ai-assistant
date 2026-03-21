import { useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!password.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { password })
      localStorage.setItem('ai_session_token', res.data.token)
      onLogin(res.data.token)
    } catch (e) {
      setError('Wrong password. Try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: 'var(--ocean-deep)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: `
        radial-gradient(ellipse at 20% 50%, rgba(13,115,119,0.1) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(0,212,224,0.07) 0%, transparent 50%)
      `
    }}>
      <div style={{
        background: 'rgba(7,30,51,0.9)',
        border: '1px solid var(--border-bright)',
        borderRadius: '20px', padding: '40px 36px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 0 60px rgba(0,212,224,0.1)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--teal-deep), var(--teal-bright))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', boxShadow: '0 0 30px rgba(0,212,224,0.3)'
          }}>🧠</div>
          <div style={{
            fontSize: '22px', fontWeight: 800,
            background: 'linear-gradient(90deg, var(--teal-bright), var(--seafoam))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Neural Knowledge Base
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'JetBrains Mono' }}>
            PRIVATE · LOCAL · SECURE
          </div>
        </div>

        {/* Password input */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', letterSpacing: '2px', marginBottom: '8px' }}>
            ACCESS PASSWORD
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Enter your password..."
            autoFocus
            style={{
              width: '100%', background: 'rgba(0,212,224,0.05)',
              border: `1px solid ${error ? 'rgba(255,107,107,0.4)' : 'var(--border-bright)'}`,
              borderRadius: '10px', padding: '12px 16px',
              color: 'var(--text-primary)', fontSize: '16px',
              outline: 'none', fontFamily: 'Outfit',
              boxSizing: 'border-box'
            }}
          />
          {error && (
            <div style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '6px', fontFamily: 'JetBrains Mono' }}>
              ❌ {error}
            </div>
          )}
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading || !password.trim()}
          style={{
            width: '100%', padding: '13px',
            background: (loading || !password.trim())
              ? 'rgba(0,212,224,0.1)'
              : 'linear-gradient(135deg, var(--teal-deep), var(--teal-bright))',
            border: 'none', borderRadius: '10px',
            color: (loading || !password.trim()) ? 'var(--text-muted)' : 'white',
            fontSize: '15px', fontWeight: 700,
            cursor: (loading || !password.trim()) ? 'not-allowed' : 'pointer',
            fontFamily: 'Outfit', transition: 'all 0.2s',
            boxShadow: (!loading && password.trim()) ? '0 0 20px rgba(0,212,224,0.3)' : 'none'
          }}
        >
          {loading ? '⚙️ Verifying...' : '🔐 Enter'}
        </button>

        <div style={{
          marginTop: '20px', fontSize: '10px',
          color: 'var(--text-muted)', textAlign: 'center',
          fontFamily: 'JetBrains Mono', lineHeight: '1.6'
        }}>
          All data stays on your machine.<br/>
          DeepSeek-R1 14B · RTX 4080 · 100% Local
        </div>
      </div>
    </div>
  )
}