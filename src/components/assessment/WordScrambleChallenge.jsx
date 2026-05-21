import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const WORD_BANK = [
  { word: 'BRAIN', hint: 'Think with it' },
  { word: 'FOCUS', hint: 'Concentration' },
  { word: 'LOGIC', hint: 'Reasoning skill' },
  { word: 'SMART', hint: 'Intelligent' },
  { word: 'QUICK', hint: 'Fast' },
  { word: 'NERVE', hint: 'Body signal carrier' },
  { word: 'THINK', hint: 'Mental process' },
  { word: 'SHARP', hint: 'Keen-minded' },
  { word: 'SPEED', hint: 'Rate of motion' },
  { word: 'LEARN', hint: 'Acquire knowledge' },
]

function scrambleWord(word) {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  // Make sure it's actually scrambled
  if (arr.join('') === word) {
    [arr[0], arr[arr.length - 1]] = [arr[arr.length - 1], arr[0]]
  }
  return arr.join('')
}

export default function WordScrambleChallenge({ onComplete }) {
  const [phase, setPhase] = useState('ready')
  const [wordIdx, setWordIdx] = useState(0)
  const [words, setWords] = useState([])
  const [scrambled, setScrambled] = useState('')
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [results, setResults] = useState([])
  const [timeLeft, setTimeLeft] = useState(20)
  const timerRef = useRef(null)
  const inputRef = useRef(null)
  const totalWords = 2

  const startChallenge = () => {
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5).slice(0, totalWords)
    setWords(shuffled)
    setScrambled(scrambleWord(shuffled[0].word))
    setPhase('playing')
    setTimeLeft(20)
    setTimeout(() => inputRef.current?.focus(), 200)
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

  const handleInput = (e) => {
    const val = e.target.value.toUpperCase()
    setInput(val)
    setFeedback(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    
    const correct = input.trim() === words[wordIdx].word
    setFeedback(correct ? 'correct' : 'wrong')
    const newResults = [...results, { correct, timeUsed: 20 - timeLeft }]
    setResults(newResults)

    setTimeout(() => {
      if (wordIdx + 1 < totalWords) {
        const nextIdx = wordIdx + 1
        setWordIdx(nextIdx)
        setScrambled(scrambleWord(words[nextIdx].word))
        setInput('')
        setFeedback(null)
        setTimeout(() => inputRef.current?.focus(), 100)
      } else {
        finish(newResults)
      }
    }, 800)
  }

  const finish = (finalResults) => {
    clearTimeout(timerRef.current)
    const res = finalResults || results
    const correct = res.filter(r => r.correct).length
    const avgTime = res.length > 0 ? res.reduce((a, r) => a + r.timeUsed, 0) / res.length : 20
    const accuracyScore = (correct / totalWords) * 70
    const speedBonus = Math.max(0, (1 - avgTime / 20)) * 30
    const score = Math.min(100, Math.round(accuracyScore + speedBonus))
    setPhase('done')
    setTimeout(() => onComplete(score), 300)
  }

  if (phase === 'ready') {
    return (
      <div className="assess-challenge-area">
        <motion.div className="assess-ready-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="assess-ready-icon">🔤</div>
          <h3>Lexical Decoder</h3>
          <p>Unscramble 2 words in 20 seconds. Type your answer and press Enter.</p>
          <button className="btn-primary assess-start-btn" onClick={startChallenge}>
            Start Decoding
          </button>
        </motion.div>
      </div>
    )
  }

  if ((phase === 'playing' || phase === 'done') && words.length > 0) {
    return (
      <div className="assess-challenge-area">
        <div className="assess-recall-header">
          <span className="assess-round-label">Word {wordIdx + 1} / {totalWords}</span>
          <div className="assess-timer-badge">
            <span className={`timer-num ${timeLeft <= 5 ? 'danger' : ''}`}>{timeLeft}s</span>
          </div>
        </div>

        <motion.div
          className="word-scramble-display"
          key={wordIdx}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {scrambled.split('').map((letter, i) => (
            <motion.span
              key={i}
              className="scramble-letter"
              initial={{ opacity: 0, y: -20, rotateZ: -15 }}
              animate={{ opacity: 1, y: 0, rotateZ: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>

        <p className="word-hint-text">💡 {words[wordIdx].hint}</p>

        <form onSubmit={handleSubmit} className="word-input-form">
          <input
            ref={inputRef}
            type="text"
            className={`word-assess-input ${feedback === 'correct' ? 'correct' : ''} ${feedback === 'wrong' ? 'wrong' : ''}`}
            value={input}
            onChange={handleInput}
            placeholder="Type your answer..."
            autoComplete="off"
            maxLength={10}
            disabled={phase === 'done'}
          />
          <button type="submit" className="word-submit-btn" disabled={phase === 'done'}>
            →
          </button>
        </form>

        {feedback === 'correct' && (
          <motion.p className="word-feedback correct" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            ✅ Correct!
          </motion.p>
        )}
        {feedback === 'wrong' && (
          <motion.p className="word-feedback wrong" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            ❌ The word was: {words[wordIdx].word}
          </motion.p>
        )}
      </div>
    )
  }

  return null
}
