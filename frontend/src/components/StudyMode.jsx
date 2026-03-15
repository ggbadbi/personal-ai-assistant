import { useState } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'

const api = axios.create({ baseURL: 'http://localhost:8000' })

const card = {
  background: 'rgba(7,30,51,0.8)',
  border: '1px solid rgba(20,168,173,0.2)',
  borderRadius: '14px', padding: '18px',
  backdropFilter: 'blur(10px)', marginBottom: '12px'
}

export default function StudyMode() {
  const [mode, setMode] = useState(null) // 'flashcards' | 'quiz' | 'notes' | 'digest'
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [flashcards, setFlashcards] = useState([])
  const [flipped, setFlipped] = useState({})
  const [currentCard, setCurrentCard] = useState(0)
  const [quiz, setQuiz] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [notes, setNotes] = useState('')
  const [digest, setDigest] = useState(null)
  const [score, setScore] = useState(null)

  const loadFlashcards = async () => {
    setLoading(true)
    setFlashcards([]); setFlipped({}); setCurrentCard(0)
    try {
      const res = await api.post('/study/flashcards', { topic: topic || null, count: 6 })
      setFlashcards(res.data.cards)
      setMode('flashcards')
    } catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)) }
    setLoading(false)
  }

  const loadQuiz = async () => {
    setLoading(true)
    setQuiz([]); setAnswers({}); setSubmitted(false); setScore(null)
    try {
      const res = await api.post('/study/quiz', { topic: topic || null, count: 5 })
      setQuiz(res.data.questions)
      setMode('quiz')
    } catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)) }
    setLoading(false)
  }

  const loadNotes = async () => {
    setLoading(true); setNotes('')
    try {
      const res = await api.post('/study/notes', { source: topic || null })
      setNotes(res.data.notes)
      setMode('notes')
    } catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)) }
    setLoading(false)
  }

  const loadDigest = async () => {
    setLoading(true); setDigest(null)
    try {
      const res = await api.get('/digest')
      setDigest(res.data)
      setMode('digest')
    } catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)) }
    setLoading(false)
  }

  const submitQuiz = () => {
    let correct = 0
    quiz.forEach((q, i) => { if (answers[i] === q.correct) correct++ })
    setScore({ correct, total: quiz.length, pct: Math.round((correct / quiz.length) * 100) })
    setSubmitted(true)
  }

  const btnPrimary = (color = '#00d4e0') => ({
    background: `linear-gradient(135deg, ${color}22, ${color}11)`,
    border: `1px solid ${color}44`, borderRadius: '10px',
    padding: '10px 18px', color, fontSize: '13px',
    cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 600,
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
  })

  return (
    <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#00d4e0', fontFamily: 'JetBrains Mono', marginBottom: '16px' }}>
        // STUDY MODE
      </div>

      {/* Topic input */}
      <div style={{ ...card, marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'JetBrains Mono' }}>
          TOPIC / SOURCE (optional)
        </div>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. Python, SQL, specific document name..."
          style={{
            width: '100%', background: 'rgba(0,212,224,0.05)',
            border: '1px solid rgba(0,212,224,0.2)', borderRadius: '8px',
            padding: '9px 14px', color: 'var(--text-primary)',
            fontSize: '13px', outline: 'none', fontFamily: 'Outfit',
            marginBottom: '10px'
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button onClick={loadFlashcards} disabled={loading} style={btnPrimary('#00d4e0')}>
            🃏 Flashcards
          </button>
          <button onClick={loadQuiz} disabled={loading} style={btnPrimary('#a78bfa')}>
            📝 Quiz Me
          </button>
          <button onClick={loadNotes} disabled={loading} style={btnPrimary('#7fffd4')}>
            📖 Study Notes
          </button>
          <button onClick={loadDigest} disabled={loading} style={btnPrimary('#ffd700')}>
            🌅 Daily Digest
          </button>
        </div>
        {loading && (
          <div style={{ textAlign: 'center', marginTop: '12px', color: '#00d4e0', fontFamily: 'JetBrains Mono', fontSize: '11px' }}>
            ⚙️ Generating with Llama 3.1...
          </div>
        )}
      </div>

      {/* Flashcards */}
      {mode === 'flashcards' && flashcards.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#00d4e0', fontFamily: 'JetBrains Mono' }}>
              FLASHCARDS · {currentCard + 1}/{flashcards.length}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setCurrentCard(c => Math.max(0, c-1))} disabled={currentCard === 0}
                style={{ ...btnPrimary(), padding: '5px 10px', fontSize: '16px' }}>←</button>
              <button onClick={() => setCurrentCard(c => Math.min(flashcards.length-1, c+1))} disabled={currentCard === flashcards.length-1}
                style={{ ...btnPrimary(), padding: '5px 10px', fontSize: '16px' }}>→</button>
            </div>
          </div>

          {/* Card flip */}
          <div
            onClick={() => setFlipped(f => ({ ...f, [currentCard]: !f[currentCard] }))}
            style={{
              minHeight: '160px', borderRadius: '12px', cursor: 'pointer',
              background: flipped[currentCard]
                ? 'linear-gradient(135deg, rgba(0,212,224,0.15), rgba(127,255,212,0.08))'
                : 'rgba(0,212,224,0.05)',
              border: `1px solid ${flipped[currentCard] ? 'rgba(0,212,224,0.4)' : 'rgba(0,212,224,0.15)'}`,
              padding: '20px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginBottom: '10px', letterSpacing: '2px' }}>
              {flipped[currentCard] ? '✅ ANSWER' : '❓ QUESTION — tap to reveal'}
            </div>
            <div style={{ fontSize: '15px', color: flipped[currentCard] ? '#7fffd4' : 'var(--text-primary)', lineHeight: '1.6', fontWeight: 500 }}>
              {flipped[currentCard] ? flashcards[currentCard]?.back : flashcards[currentCard]?.front}
            </div>
            {flipped[currentCard] && flashcards[currentCard]?.source && (
              <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                📄 {flashcards[currentCard].source}
              </div>
            )}
          </div>

          {/* Difficulty badge */}
          {flashcards[currentCard]?.difficulty && (
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <span style={{
                fontSize: '10px', padding: '2px 10px', borderRadius: '20px',
                fontFamily: 'JetBrains Mono',
                background: flashcards[currentCard].difficulty === 'hard' ? 'rgba(255,107,107,0.1)' : flashcards[currentCard].difficulty === 'medium' ? 'rgba(255,215,0,0.1)' : 'rgba(0,255,136,0.1)',
                color: flashcards[currentCard].difficulty === 'hard' ? '#ff6b6b' : flashcards[currentCard].difficulty === 'medium' ? '#ffd700' : '#00ff88',
                border: `1px solid currentColor`
              }}>
                {flashcards[currentCard].difficulty.toUpperCase()}
              </span>
            </div>
          )}

          {/* All cards grid */}
          <div style={{ marginTop: '14px', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {flashcards.map((_, i) => (
              <div key={i} onClick={() => { setCurrentCard(i); setFlipped(f => ({ ...f, [i]: false })) }}
                style={{
                  width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer',
                  background: i === currentCard ? 'rgba(0,212,224,0.3)' : flipped[i] ? 'rgba(127,255,212,0.2)' : 'rgba(0,212,224,0.05)',
                  border: `1px solid ${i === currentCard ? '#00d4e0' : 'rgba(0,212,224,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: 'var(--text-muted)'
                }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz */}
      {mode === 'quiz' && quiz.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#a78bfa', fontFamily: 'JetBrains Mono', marginBottom: '14px' }}>
            QUIZ · {quiz.length} QUESTIONS
          </div>

          {score && (
            <div style={{
              padding: '16px', marginBottom: '16px', textAlign: 'center',
              background: score.pct >= 70 ? 'rgba(0,255,136,0.08)' : 'rgba(255,107,107,0.08)',
              border: `1px solid ${score.pct >= 70 ? 'rgba(0,255,136,0.3)' : 'rgba(255,107,107,0.3)'}`,
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: score.pct >= 70 ? '#00ff88' : '#ff6b6b', fontFamily: 'JetBrains Mono' }}>
                {score.pct}%
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                {score.correct}/{score.total} correct
                {score.pct >= 70 ? ' 🎉 Great job!' : ' 📚 Keep studying!'}
              </div>
            </div>
          )}

          {quiz.map((q, qi) => (
            <div key={qi} style={{
              marginBottom: '16px', padding: '14px',
              background: 'rgba(167,139,250,0.04)',
              border: '1px solid rgba(167,139,250,0.1)',
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px', fontWeight: 500 }}>
                {qi + 1}. {q.question}
              </div>
              {q.options?.map((opt, oi) => {
                let bg = 'rgba(167,139,250,0.05)'
                let border = 'rgba(167,139,250,0.15)'
                let color = 'var(--text-secondary)'
                if (answers[qi] === oi) { bg = 'rgba(167,139,250,0.15)'; border = '#a78bfa'; color = '#a78bfa' }
                if (submitted) {
                  if (oi === q.correct) { bg = 'rgba(0,255,136,0.1)'; border = '#00ff88'; color = '#00ff88' }
                  else if (answers[qi] === oi && oi !== q.correct) { bg = 'rgba(255,107,107,0.1)'; border = '#ff6b6b'; color = '#ff6b6b' }
                }
                return (
                  <div key={oi} onClick={() => !submitted && setAnswers(a => ({ ...a, [qi]: oi }))}
                    style={{
                      padding: '8px 12px', marginBottom: '5px', borderRadius: '8px',
                      background: bg, border: `1px solid ${border}`,
                      color, fontSize: '12px', cursor: submitted ? 'default' : 'pointer',
                      transition: 'all 0.15s'
                    }}>
                    {opt}
                  </div>
                )
              })}
              {submitted && q.explanation && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,212,224,0.05)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  💡 {q.explanation}
                </div>
              )}
            </div>
          ))}

          {!submitted ? (
            <button onClick={submitQuiz} disabled={Object.keys(answers).length < quiz.length}
              style={{ ...btnPrimary('#a78bfa'), width: '100%', justifyContent: 'center' }}>
              Submit Quiz ({Object.keys(answers).length}/{quiz.length} answered)
            </button>
          ) : (
            <button onClick={loadQuiz} style={{ ...btnPrimary('#a78bfa'), width: '100%', justifyContent: 'center' }}>
              🔄 New Quiz
            </button>
          )}
        </div>
      )}

      {/* Study Notes */}
      {mode === 'notes' && notes && (
        <div style={card}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#7fffd4', fontFamily: 'JetBrains Mono', marginBottom: '14px' }}>
            STUDY NOTES
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
            <ReactMarkdown>{notes}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Daily Digest */}
      {mode === 'digest' && digest && (
        <div style={card}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#ffd700', fontFamily: 'JetBrains Mono', marginBottom: '14px' }}>
            DAILY DIGEST · {digest.date}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {[
              { label: 'Total Chunks', value: digest.stats.total_chunks, color: '#00d4e0' },
              { label: 'New Today', value: digest.stats.new_docs_today, color: '#7fffd4' },
              { label: "Queries Today", value: digest.stats.queries_today, color: '#ffd700' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '10px', background: `rgba(${s.color === '#00d4e0' ? '0,212,224' : '0,0,0'},0.1)`, borderRadius: '8px', border: `1px solid ${s.color}22` }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.8', color: 'var(--text-primary)' }}>
            <ReactMarkdown>{digest.digest}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}