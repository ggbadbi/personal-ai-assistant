import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

export default function App() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#07070f',
      color: '#e0e0f0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden',
      minHeight: 0
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #1a1a2e',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#080810',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '20px' }}>🧠</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Chat with your Knowledge</div>
            <div style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace' }}>
              Llama 3.1 · RTX 4080 · 100% local · 100% free
            </div>
          </div>
        </div>
        <ChatWindow />
      </div>
    </div>
  )
}