import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div style={{
      display: 'flex', height: '100vh',
      overflow: 'hidden', minHeight: 0,
      background: 'var(--ocean-deep)'
    }}>
      {/* Animated background bubbles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(0,212,224,${0.03 + i * 0.01}) 0%, transparent 70%)`,
            width: `${200 + i * 100}px`,
            height: `${200 + i * 100}px`,
            left: `${(i * 17) % 100}%`,
            top: `${(i * 23) % 100}%`,
            animation: `float ${8 + i * 3}s ease-in-out infinite`,
            animationDelay: `${i * 1.5}s`
          }} />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', minHeight: 0 }}>
        {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', minHeight: 0
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '14px',
            background: 'rgba(4, 20, 36, 0.8)',
            backdropFilter: 'blur(20px)',
            flexShrink: 0
          }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '6px 10px',
                color: 'var(--teal)', cursor: 'pointer', fontSize: '16px'
              }}>
                ☰
              </button>
            )}

            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--teal-deep), var(--teal-bright))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 0 15px rgba(0,212,224,0.3)'
            }}>
              🧠
            </div>

            <div>
              <div style={{
                fontSize: '15px', fontWeight: 700,
                background: 'linear-gradient(90deg, var(--teal-bright), var(--seafoam))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                Neural Knowledge Base
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                Llama 3.1 · RTX 4080 · 100% local
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#00ff88', boxShadow: '0 0 6px #00ff88'
              }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>ONLINE</span>
            </div>
          </div>

          <ChatWindow />
        </div>
      </div>
    </div>
  )
}