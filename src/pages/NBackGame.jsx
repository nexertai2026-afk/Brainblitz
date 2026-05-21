import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { saveScore } from '../lib/scores'
import { getAdaptiveDifficulty } from '../utils/analytics'

const GRID_SIZE = 9
const SHOW_TIME = 1800
const ROUNDS = 25

export default function NBackGame() {
  const { updateScore, analytics, logSession } = useScore()
  const { user, refreshProfile } = useAuthContext()
  const [phase, setPhase] = useState('start')
  const [nLevel, setNLevel] = useState(2)
  const [sequence, setSequence] = useState([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [activeCell, setActiveCell] = useState(-1)
  const [responses, setResponses] = useState([])
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [falseAlarms, setFalseAlarms] = useState(0)
  const [score, setScoreVal] = useState(0)
  const [responded, setResponded] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(0)

  const generateSequence = (n) => {
    const seq = []
    for (let i = 0; i < ROUNDS; i++) {
      if (i >= n && Math.random() > 0.6) {
        seq.push(seq[i - n]) // match
      } else {
        seq.push(Math.floor(Math.random() * GRID_SIZE))
      }
    }
    return seq
  }

  const start = () => {
    const diff = getAdaptiveDifficulty(analytics, 'nback')
    const n = Math.min(diff + 1, 4) // 2-back, 3-back, or 4-back
    setNLevel(n)
    const seq = generateSequence(n)
    setSequence(seq)
    setCurrentIdx(-1)
    setResponses([])
    setHits(0); setMisses(0); setFalseAlarms(0); setScoreVal(0)
    setPhase('playing')
    setFeedback(null)
    startTimeRef.current = Date.now()
  }

  useEffect(() => {
    if (phase !== 'playing') return
    let idx = -1
    const advance = () => {
      idx++
      if (idx >= sequence.length) {
        setPhase('done')
        return
      }
      setCurrentIdx(idx)
      setActiveCell(sequence[idx])
      setResponded(false)
      setFeedback(null)

      // Check if previous trial was a miss (had match but no response)
      if (idx > 0) {
        const prevIdx = idx - 1
        if (prevIdx >= nLevel && sequence[prevIdx] === sequence[prevIdx - nLevel]) {
          // Was a match - check if responded
          const wasResponded = responses.includes(prevIdx)
          // This is handled in real-time now
        }
      }

      setTimeout(() => setActiveCell(-1), SHOW_TIME * 0.7)
    }
    advance()
    timerRef.current = setInterval(advance, SHOW_TIME)
    return () => clearInterval(timerRef.current)
  }, [phase, sequence, nLevel])

  useEffect(() => {
    if (phase === 'done') {
      // Calculate final score
      let h = 0, m = 0, fa = 0
      for (let i = nLevel; i < sequence.length; i++) {
        const isMatch = sequence[i] === sequence[i - nLevel]
        const didRespond = responses.includes(i)
        if (isMatch && didRespond) h++
        else if (isMatch && !didRespond) m++
        else if (!isMatch && didRespond) fa++
      }
      setHits(h); setMisses(m); setFalseAlarms(fa)
      const finalScore = Math.max(0, h * 20 - fa * 10)
      setScoreVal(finalScore)
      updateScore('nback', finalScore)
      const total = h + m
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      logSession({
        game: 'nback', score: finalScore, accuracy: total > 0 ? (h / total) * 100 : 0,
        difficulty: nLevel, duration
      })

      // Save to Supabase
      if (user) {
        saveScore(user.id, {
          game_name: 'Working Memory Lab',
          score: finalScore,
          difficulty: nLevel,
          duration_seconds: duration,
        }).then(() => refreshProfile())
      }
    }
  }, [phase])

  const handleMatch = useCallback(() => {
    if (phase !== 'playing' || responded || currentIdx < nLevel) return
    setResponded(true)
    setResponses(prev => [...prev, currentIdx])
    const isMatch = sequence[currentIdx] === sequence[currentIdx - nLevel]
    if (isMatch) {
      setFeedback('hit')
      setScoreVal(s => s + 20)
    } else {
      setFeedback('false')
    }
  }, [phase, responded, currentIdx, nLevel, sequence])

  useEffect(() => {
    const handler = (e) => { if (e.code === 'Space') { e.preventDefault(); handleMatch() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleMatch])

  const progress = sequence.length > 0 ? ((currentIdx + 1) / sequence.length) * 100 : 0

  return (
    <div className="game-page fade-in">
      <div className="game-header">
        <Link to="/" className="back-btn">← Back</Link>
        {phase === 'playing' && (
          <div className="game-stats">
            <div className="stat-box"><div className="label">N-Back</div><div className="value">{nLevel}</div></div>
            <div className="stat-box"><div className="label">Trial</div><div className="value">{currentIdx + 1}/{ROUNDS}</div></div>
            <div className="stat-box"><div className="label">Score</div><div className="value">{score}</div></div>
          </div>
        )}
      </div>
      <div className="game-area">
        {phase === 'start' && (
          <div className="result-screen">
            <div className="result-emoji">🧪</div>
            <h2 className="game-title">N-Back Test</h2>
            <p className="game-subtitle">Press MATCH when the current position is the same as <strong>N steps ago</strong>. This is the gold standard for working memory training!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>
              Adaptive: N-level adjusts to your skill
            </p>
            <button className="btn-primary" onClick={start}>Start</button>
          </div>
        )}
        {phase === 'playing' && (
          <>
            <div className="timer-bar-container"><div className="timer-bar" style={{ width: `${progress}%` }} /></div>
            <div className="nback-grid">
              {Array.from({ length: GRID_SIZE }).map((_, i) => (
                <div key={i} className={`nback-cell ${activeCell === i ? 'active' : ''}`} />
              ))}
            </div>
            <button className={`nback-match-btn ${feedback === 'hit' ? 'hit' : ''} ${feedback === 'false' ? 'false-alarm' : ''}`}
              onClick={handleMatch} disabled={responded}>
              {feedback === 'hit' ? '✓ Match!' : feedback === 'false' ? '✗ No match' : '🎯 MATCH'}
            </button>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 8 }}>
              or press SPACEBAR
            </p>
          </>
        )}
        {phase === 'done' && (
          <div className="result-screen">
            <div className="result-emoji">{hits >= 8 ? '🏆' : hits >= 5 ? '🌟' : '💪'}</div>
            <div className="result-label">{nLevel}-Back Complete</div>
            <div className="result-score">{score} XP</div>
            <div style={{ display: 'flex', gap: 20, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span>✓ Hits: {hits}</span>
              <span>✗ Misses: {misses}</span>
              <span>⚠ False: {falseAlarms}</span>
            </div>
            <div className="result-actions">
              <button className="btn-primary" onClick={start}>Play Again</button>
              <Link to="/" className="btn-secondary">Home</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
