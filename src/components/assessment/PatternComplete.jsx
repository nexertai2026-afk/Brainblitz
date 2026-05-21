import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const SHAPES = [
  { shape: 'circle', color: '#7c3aed' },
  { shape: 'square', color: '#06b6d4' },
  { shape: 'triangle', color: '#f43f5e' },
  { shape: 'diamond', color: '#10b981' },
  { shape: 'hexagon', color: '#f59e0b' },
  { shape: 'star', color: '#8b5cf6' },
]

function generatePatternQuestion() {
  // Pick a logical sequence pattern
  const patternTypes = ['repeat', 'shift', 'alternate']
  const type = patternTypes[Math.floor(Math.random() * patternTypes.length)]

  let sequence = []
  let answer
  let options

  if (type === 'repeat') {
    // A B C A B C => A
    const base = SHAPES.sort(() => Math.random() - 0.5).slice(0, 3)
    sequence = [...base, ...base]
    answer = base[0]
  } else if (type === 'shift') {
    // A B C D E => F (sequential colors)
    const shuffled = [...SHAPES].sort(() => Math.random() - 0.5)
    sequence = shuffled.slice(0, 5)
    answer = shuffled[5] || SHAPES[0]
  } else {
    // A B A B A => B
    const a = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    let b = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    while (b.shape === a.shape) b = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    sequence = [a, b, a, b, a]
    answer = b
  }

  // Generate options (answer + 3 distractors)
  const distractors = SHAPES.filter(s => s.shape !== answer.shape)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  options = [answer, ...distractors].sort(() => Math.random() - 0.5)

  return { sequence, answer, options }
}

function ShapeIcon({ shape, color, size = 36 }) {
  const s = size
  switch (shape) {
    case 'circle':
      return <svg width={s} height={s} viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill={color} opacity="0.85"/></svg>
    case 'square':
      return <svg width={s} height={s} viewBox="0 0 40 40"><rect x="6" y="6" width="28" height="28" rx="4" fill={color} opacity="0.85"/></svg>
    case 'triangle':
      return <svg width={s} height={s} viewBox="0 0 40 40"><polygon points="20,4 36,36 4,36" fill={color} opacity="0.85"/></svg>
    case 'diamond':
      return <svg width={s} height={s} viewBox="0 0 40 40"><polygon points="20,2 38,20 20,38 2,20" fill={color} opacity="0.85"/></svg>
    case 'hexagon':
      return <svg width={s} height={s} viewBox="0 0 40 40"><polygon points="20,2 36,10 36,30 20,38 4,30 4,10" fill={color} opacity="0.85"/></svg>
    case 'star':
      return <svg width={s} height={s} viewBox="0 0 40 40"><polygon points="20,2 25,15 38,15 27,23 31,37 20,28 9,37 13,23 2,15 15,15" fill={color} opacity="0.85"/></svg>
    default:
      return <svg width={s} height={s} viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill={color} opacity="0.85"/></svg>
  }
}

export default function PatternComplete({ onComplete }) {
  const [phase, setPhase] = useState('ready')
  const [round, setRound] = useState(0)
  const [question, setQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [results, setResults] = useState([])
  const [timeLeft, setTimeLeft] = useState(30)
  const timerRef = useRef(null)
  const totalRounds = 3

  const startChallenge = () => {
    setPhase('playing')
    setTimeLeft(30)
    setQuestion(generatePatternQuestion())
  }

  useEffect(() => {
    if (phase === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timerRef.current)
    }
    if (phase === 'playing' && timeLeft <= 0) {
      finish()
    }
  }, [phase, timeLeft])

  const handleChoice = (opt) => {
    if (feedback) return
    const correct = opt.shape === question.answer.shape
    setFeedback(correct ? 'correct' : 'wrong')
    const newResults = [...results, correct]
    setResults(newResults)

    setTimeout(() => {
      if (round + 1 < totalRounds) {
        setRound(r => r + 1)
        setQuestion(generatePatternQuestion())
        setFeedback(null)
      } else {
        finish(newResults)
      }
    }, 800)
  }

  const finish = (finalResults) => {
    clearTimeout(timerRef.current)
    const res = finalResults || results
    const correct = res.filter(Boolean).length
    const score = Math.round((correct / totalRounds) * 100)
    setPhase('done')
    setTimeout(() => onComplete(score), 300)
  }

  if (phase === 'ready') {
    return (
      <div className="assess-challenge-area">
        <motion.div className="assess-ready-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="assess-ready-icon">🔷</div>
          <h3>Pattern Intelligence</h3>
          <p>Find the next shape in the sequence. 3 rounds to test your reasoning.</p>
          <button className="btn-primary assess-start-btn" onClick={startChallenge}>
            Begin Pattern Test
          </button>
        </motion.div>
      </div>
    )
  }

  if ((phase === 'playing' || phase === 'done') && question) {
    return (
      <div className="assess-challenge-area">
        <div className="assess-recall-header">
          <span className="assess-round-label">Round {round + 1} / {totalRounds}</span>
          <div className="assess-timer-badge">
            <span className={`timer-num ${timeLeft <= 8 ? 'danger' : ''}`}>{timeLeft}s</span>
          </div>
        </div>

        <p className="assess-instruction">What comes next?</p>

        <motion.div
          className="pattern-sequence"
          key={round}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {question.sequence.map((item, i) => (
            <motion.div
              key={i}
              className="pattern-seq-item"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <ShapeIcon shape={item.shape} color={item.color} size={40} />
            </motion.div>
          ))}
          <div className="pattern-seq-item pattern-mystery">
            <span>?</span>
          </div>
        </motion.div>

        <div className="pattern-options">
          {question.options.map((opt, i) => (
            <motion.button
              key={i}
              className={`pattern-option-btn ${feedback === 'correct' && opt.shape === question.answer.shape ? 'correct' : ''} ${feedback === 'wrong' && opt.shape === question.answer.shape ? 'reveal' : ''}`}
              onClick={() => handleChoice(opt)}
              whileTap={{ scale: 0.92 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              disabled={!!feedback}
            >
              <ShapeIcon shape={opt.shape} color={opt.color} size={44} />
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  return null
}
