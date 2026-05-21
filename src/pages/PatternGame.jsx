import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { saveScore } from '../lib/scores'

export default function PatternGame() {
  const { updateScore, logSession } = useScore()
  const { user, refreshProfile } = useAuthContext()
  const [phase, setPhase] = useState('start')
  const [sequence, setSequence] = useState([])
  const [userSeq, setUserSeq] = useState([])
  const [activeCell, setActiveCell] = useState(null)
  const [level, setLevel] = useState(1)
  const [showingPattern, setShowingPattern] = useState(false)
  const [errorCell, setErrorCell] = useState(null)
  const timeoutRef = useRef(null)
  const startTimeRef = useRef(0)

  const addToSequence = useCallback(() => {
    const next = [...sequence, Math.floor(Math.random() * 9)]
    setSequence(next)
    setUserSeq([])
    showPattern(next)
  }, [sequence])

  const showPattern = (seq) => {
    setShowingPattern(true)
    seq.forEach((cell, i) => {
      setTimeout(() => setActiveCell(cell), (i + 1) * 600)
      setTimeout(() => setActiveCell(null), (i + 1) * 600 + 400)
    })
    setTimeout(() => setShowingPattern(false), (seq.length + 1) * 600)
  }

  const startGame = () => {
    setPhase('playing')
    setLevel(1)
    const first = [Math.floor(Math.random() * 9)]
    setSequence(first)
    setUserSeq([])
    setErrorCell(null)
    showPattern(first)
    startTimeRef.current = Date.now()
  }

  const handleCellClick = (idx) => {
    if (showingPattern || phase !== 'playing') return
    const newUserSeq = [...userSeq, idx]
    setUserSeq(newUserSeq)
    setActiveCell(idx)
    setTimeout(() => setActiveCell(null), 200)

    const step = newUserSeq.length - 1
    if (idx !== sequence[step]) {
      setErrorCell(idx)
      setTimeout(() => {
        setPhase('done')
        setErrorCell(null)
        const sc = (level - 1) * 25
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
        updateScore('pattern', sc)
        logSession({ game: 'pattern', score: sc, accuracy: ((level - 1) / level) * 100, difficulty: 1 })

        // Save to Supabase
        if (user) {
          saveScore(user.id, {
            game_name: 'Pattern Intelligence',
            score: sc,
            difficulty: 1,
            duration_seconds: duration,
          }).then(() => refreshProfile())
        }
      }, 600)
      return
    }

    if (newUserSeq.length === sequence.length) {
      setLevel(l => l + 1)
      setTimeout(() => {
        const next = [...sequence, Math.floor(Math.random() * 9)]
        setSequence(next)
        setUserSeq([])
        showPattern(next)
      }, 800)
    }
  }

  const score = (level - 1) * 25

  return (
    <div className="game-page fade-in">
      <div className="game-header">
        <Link to="/" className="back-btn">← Back</Link>
        {phase === 'playing' && (
          <div className="game-stats">
            <div className="stat-box"><div className="label">Level</div><div className="value">{level}</div></div>
            <div className="stat-box"><div className="label">Score</div><div className="value">{score}</div></div>
          </div>
        )}
      </div>
      <div className="game-area">
        {phase === 'start' && (
          <div className="result-screen">
            <div className="result-emoji">🎯</div>
            <h2 className="game-title">Pattern Recall</h2>
            <p className="game-subtitle">Watch the pattern, then repeat it from memory!</p>
            <button className="btn-primary" onClick={startGame}>Start</button>
          </div>
        )}
        {phase === 'playing' && (
          <>
            <p className="game-subtitle">{showingPattern ? '👀 Watch the pattern...' : '🖱️ Your turn! Repeat it.'}</p>
            <div className="pattern-display">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i}
                  className={`pattern-cell ${activeCell === i ? (showingPattern ? 'lit' : 'user-lit') : ''} ${errorCell === i ? 'error' : ''}`}
                  onClick={() => handleCellClick(i)} />
              ))}
            </div>
          </>
        )}
        {phase === 'done' && (
          <div className="result-screen">
            <div className="result-emoji">{level >= 8 ? '🏆' : level >= 4 ? '🌟' : '💪'}</div>
            <div className="result-label">You reached Level {level}</div>
            <div className="result-score">{score} XP</div>
            <div className="result-actions">
              <button className="btn-primary" onClick={startGame}>Play Again</button>
              <Link to="/" className="btn-secondary">Home</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
