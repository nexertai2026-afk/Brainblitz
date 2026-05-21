import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

export default function ReactionTap({ onComplete }) {
  const [phase, setPhase] = useState('ready') // ready | waiting | go | tapped | between | done
  const [round, setRound] = useState(0)
  const [times, setTimes] = useState([])
  const [goTime, setGoTime] = useState(null)
  const [reactionTime, setReactionTime] = useState(null)
  const [tooEarly, setTooEarly] = useState(false)
  const timeoutRef = useRef(null)
  const totalRounds = 3

  const startChallenge = () => {
    setPhase('waiting')
    startWaiting()
  }

  const startWaiting = () => {
    setTooEarly(false)
    setReactionTime(null)
    // Random delay 1.5 - 4 seconds
    const delay = 1500 + Math.random() * 2500
    timeoutRef.current = setTimeout(() => {
      setGoTime(Date.now())
      setPhase('go')
    }, delay)
  }

  const handleTap = () => {
    if (phase === 'waiting') {
      // Too early!
      clearTimeout(timeoutRef.current)
      setTooEarly(true)
      setPhase('tapped')
      setTimeout(() => {
        setPhase('waiting')
        startWaiting()
      }, 1200)
      return
    }

    if (phase === 'go') {
      const rt = Date.now() - goTime
      setReactionTime(rt)
      const newTimes = [...times, rt]
      setTimes(newTimes)
      setPhase('tapped')

      setTimeout(() => {
        if (round + 1 < totalRounds) {
          setRound(r => r + 1)
          setPhase('waiting')
          startWaiting()
        } else {
          finishChallenge(newTimes)
        }
      }, 1500)
    }
  }

  const finishChallenge = (finalTimes) => {
    const t = finalTimes || times
    if (t.length === 0) {
      onComplete(20)
      return
    }
    const avg = t.reduce((a, b) => a + b, 0) / t.length
    // Score: 100 for <=150ms, 0 for >=600ms
    const score = Math.round(Math.max(0, Math.min(100, ((600 - avg) / 450) * 100)))
    setPhase('done')
    setTimeout(() => onComplete(score), 300)
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  if (phase === 'ready') {
    return (
      <div className="assess-challenge-area">
        <motion.div className="assess-ready-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="assess-ready-icon">🎯</div>
          <h3>Reaction Speed</h3>
          <p>Tap the circle the moment it turns green. 3 rounds. Don't tap too early!</p>
          <button className="btn-primary assess-start-btn" onClick={startChallenge}>
            Test My Reflexes
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="assess-challenge-area">
      <div className="reaction-round-dots">
        {Array.from({ length: totalRounds }).map((_, i) => (
          <span key={i} className={`q-dot ${i < round ? 'done' : ''} ${i === round ? 'active' : ''}`} />
        ))}
      </div>

      <motion.div
        className={`reaction-tap-zone ${phase === 'waiting' ? 'waiting' : ''} ${phase === 'go' ? 'go' : ''} ${phase === 'tapped' ? 'tapped' : ''}`}
        onClick={handleTap}
        whileTap={{ scale: 0.95 }}
        animate={phase === 'go' ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.6, repeat: phase === 'go' ? Infinity : 0 }}
      >
        {phase === 'waiting' && !tooEarly && (
          <>
            <span className="reaction-tap-icon">⏳</span>
            <span className="reaction-tap-text">Wait for green...</span>
          </>
        )}
        {phase === 'waiting' && tooEarly && (
          <>
            <span className="reaction-tap-icon">😬</span>
            <span className="reaction-tap-text warning">Too early! Wait...</span>
          </>
        )}
        {phase === 'go' && (
          <>
            <span className="reaction-tap-icon">⚡</span>
            <span className="reaction-tap-text go">TAP NOW!</span>
          </>
        )}
        {phase === 'tapped' && reactionTime && (
          <>
            <span className="reaction-tap-icon">✅</span>
            <motion.span
              className="reaction-time-display"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              {reactionTime}ms
            </motion.span>
            <span className="reaction-tap-text">
              {reactionTime < 200 ? 'Lightning fast! ⚡' : reactionTime < 350 ? 'Great reflexes!' : 'Not bad!'}
            </span>
          </>
        )}
        {phase === 'tapped' && tooEarly && (
          <>
            <span className="reaction-tap-icon">🔴</span>
            <span className="reaction-tap-text warning">Too early! Try again...</span>
          </>
        )}
      </motion.div>
    </div>
  )
}
