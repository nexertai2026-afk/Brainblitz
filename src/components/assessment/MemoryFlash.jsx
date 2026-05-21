import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ALL_ICONS = ['🧠','⚡','🔥','💎','🎯','🌟','🚀','🎨','🔮','💫','🌊','🎭','🦋','🍀','❄️','🎪']

export default function MemoryFlash({ onComplete }) {
  const [phase, setPhase] = useState('ready') // ready | memorize | recall | done
  const [icons, setIcons] = useState([])
  const [decoyGrid, setDecoyGrid] = useState([])
  const [selected, setSelected] = useState([])
  const [timeLeft, setTimeLeft] = useState(30)
  const timerRef = useRef(null)

  const startChallenge = useCallback(() => {
    const shuffled = [...ALL_ICONS].sort(() => Math.random() - 0.5)
    const chosen = shuffled.slice(0, 6)
    setIcons(chosen)
    setPhase('memorize')

    // Show icons for 2.5 seconds then switch to recall
    setTimeout(() => {
      // Create grid of 12 icons (6 correct + 6 decoys)
      const decoys = shuffled.slice(6, 12)
      const grid = [...chosen, ...decoys].sort(() => Math.random() - 0.5)
      setDecoyGrid(grid)
      setPhase('recall')
      setTimeLeft(25)
    }, 2500)
  }, [])

  // Timer for recall phase
  useEffect(() => {
    if (phase === 'recall' && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timerRef.current)
    }
    if (phase === 'recall' && timeLeft <= 0) {
      finishChallenge()
    }
  }, [phase, timeLeft])

  const handleSelect = (icon) => {
    if (phase !== 'recall') return
    if (selected.includes(icon)) {
      setSelected(prev => prev.filter(i => i !== icon))
    } else {
      const newSelected = [...selected, icon]
      setSelected(newSelected)
      if (newSelected.length === 6) {
        setTimeout(() => finishChallenge(newSelected), 400)
      }
    }
  }

  const finishChallenge = (finalSelected) => {
    clearTimeout(timerRef.current)
    const sel = finalSelected || selected
    const correct = sel.filter(i => icons.includes(i)).length
    const wrong = sel.filter(i => !icons.includes(i)).length
    const score = Math.max(0, Math.round((correct / 6) * 100 - (wrong * 10)))
    setPhase('done')
    setTimeout(() => onComplete(score), 500)
  }

  if (phase === 'ready') {
    return (
      <div className="assess-challenge-area">
        <motion.div
          className="assess-ready-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="assess-ready-icon">🧠</div>
          <h3>Visual Memory Test</h3>
          <p>You'll see 6 icons for 2.5 seconds. Memorize them, then pick them from a grid.</p>
          <button className="btn-primary assess-start-btn" onClick={startChallenge}>
            Ready? Go!
          </button>
        </motion.div>
      </div>
    )
  }

  if (phase === 'memorize') {
    return (
      <div className="assess-challenge-area">
        <p className="assess-instruction">Memorize these icons!</p>
        <motion.div
          className="memory-flash-grid"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {icons.map((icon, i) => (
            <motion.div
              key={i}
              className="memory-flash-icon"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {icon}
            </motion.div>
          ))}
        </motion.div>
        <motion.div
          className="memorize-timer-ring"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: 283 }}
          transition={{ duration: 2.5, ease: 'linear' }}
        >
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <motion.circle
              cx="30" cy="30" r="26" fill="none" stroke="url(#timerGrad)" strokeWidth="4"
              strokeDasharray="163"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 163 }}
              transition={{ duration: 2.5, ease: 'linear' }}
              strokeLinecap="round"
              transform="rotate(-90 30 30)"
            />
            <defs>
              <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>
    )
  }

  if (phase === 'recall' || phase === 'done') {
    return (
      <div className="assess-challenge-area">
        <div className="assess-recall-header">
          <p className="assess-instruction">Select the 6 icons you saw</p>
          <div className="assess-timer-badge">
            <span className={`timer-num ${timeLeft <= 5 ? 'danger' : ''}`}>{timeLeft}s</span>
          </div>
        </div>
        <div className="assess-recall-count">{selected.length} / 6 selected</div>
        <div className="memory-recall-grid">
          {decoyGrid.map((icon, i) => (
            <motion.button
              key={i}
              className={`memory-recall-cell ${selected.includes(icon) ? 'selected' : ''}`}
              onClick={() => handleSelect(icon)}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              disabled={phase === 'done'}
            >
              {icon}
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  return null
}
