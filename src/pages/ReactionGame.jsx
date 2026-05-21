import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { saveScore } from '../lib/scores'

export default function ReactionGame() {
  const { updateScore, logSession } = useScore()
  const { user, refreshProfile } = useAuthContext()
  const [phase, setPhase] = useState('start')
  const [times, setTimes] = useState([])
  const [round, setRound] = useState(0)
  const startRef = useRef(0)
  const timerRef = useRef(null)
  const ROUNDS = 5

  const beginRound = () => {
    setPhase('waiting')
    const delay = 1500 + Math.random() * 3000
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now()
      setPhase('ready')
    }, delay)
  }

  const handleClick = () => {
    if (phase === 'waiting') {
      clearTimeout(timerRef.current)
      setPhase('too-early')
      return
    }
    if (phase === 'ready') {
      const ms = Date.now() - startRef.current
      const newTimes = [...times, ms]
      setTimes(newTimes)
      setRound(r => r + 1)
      if (newTimes.length >= ROUNDS) {
        setPhase('done')
        const avg = Math.round(newTimes.reduce((a, b) => a + b, 0) / newTimes.length)
        const sc = Math.max(10, 300 - avg)
        updateScore('reaction', sc)
        logSession({ game: 'reaction', score: sc, reactionTime: Math.min(...newTimes), accuracy: 90, difficulty: 1 })

        // Save to Supabase
        if (user) {
          saveScore(user.id, {
            game_name: 'Reflex Matrix',
            score: sc,
            difficulty: 1,
            duration_seconds: Math.round(newTimes.reduce((a, b) => a + b, 0) / 1000),
          }).then(() => refreshProfile())
        }
      } else {
        setPhase('clicked')
      }
    }
  }

  const restart = () => { setPhase('start'); setTimes([]); setRound(0) }
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0
  const best = times.length ? Math.min(...times) : 0
  const sc = Math.max(10, 300 - avg)

  return (
    <div className="game-page fade-in">
      <div className="game-header">
        <Link to="/" className="back-btn">← Back</Link>
        {(phase !== 'start' && phase !== 'done') && (
          <div className="game-stats">
            <div className="stat-box"><div className="label">Round</div><div className="value">{round}/{ROUNDS}</div></div>
            {times.length > 0 && <div className="stat-box"><div className="label">Best</div><div className="value">{best}ms</div></div>}
          </div>
        )}
      </div>
      <div className="game-area">
        {phase === 'start' && (
          <div className="result-screen">
            <div className="result-emoji">🔥</div>
            <h2 className="game-title">Reaction Test</h2>
            <p className="game-subtitle">Wait for green, then click as fast as you can! {ROUNDS} rounds.</p>
            <button className="btn-primary" onClick={beginRound}>Start</button>
          </div>
        )}
        {phase === 'waiting' && (
          <div className="reaction-zone waiting" onClick={handleClick}>
            <span style={{ fontSize: '2.5rem' }}>🔴</span>
            <span>Wait for green...</span>
          </div>
        )}
        {phase === 'ready' && (
          <div className="reaction-zone ready" onClick={handleClick}>
            <span style={{ fontSize: '2.5rem' }}>🟢</span>
            <span>CLICK NOW!</span>
          </div>
        )}
        {phase === 'clicked' && (
          <div className="result-screen">
            <div className="reaction-time">{times[times.length - 1]}ms</div>
            <p style={{ color: 'var(--text-secondary)' }}>Round {round} of {ROUNDS}</p>
            <button className="btn-primary" onClick={beginRound} style={{ marginTop: 16 }}>Next Round</button>
          </div>
        )}
        {phase === 'too-early' && (
          <div className="result-screen">
            <div className="result-emoji">😬</div>
            <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Too early! Wait for green.</p>
            <button className="btn-primary" onClick={beginRound} style={{ marginTop: 16 }}>Try Again</button>
          </div>
        )}
        {phase === 'done' && (
          <div className="result-screen">
            <div className="result-emoji">{avg < 250 ? '🏆' : avg < 350 ? '🌟' : '💪'}</div>
            <div className="result-label">Average Reaction Time</div>
            <div className="reaction-time">{avg}ms</div>
            <div className="result-score">{sc} XP</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Best: {best}ms | Times: {times.map(t => t + 'ms').join(', ')}
            </p>
            <div className="result-actions">
              <button className="btn-primary" onClick={restart}>Play Again</button>
              <Link to="/" className="btn-secondary">Home</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
