import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

function generateProblem(difficulty) {
  const ops = ['+', '-', '×']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a, b, answer
  const range = 10 + difficulty * 8

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * range) + 5
      b = Math.floor(Math.random() * range) + 3
      answer = a + b
      break
    case '-':
      a = Math.floor(Math.random() * range) + 15
      b = Math.floor(Math.random() * (a - 2)) + 1
      answer = a - b
      break
    case '×':
      a = Math.floor(Math.random() * 12) + 2
      b = Math.floor(Math.random() * 12) + 2
      answer = a * b
      break
  }

  // Generate 3 wrong options
  const wrongSet = new Set()
  while (wrongSet.size < 3) {
    const offset = Math.floor(Math.random() * 15) - 7
    const wrong = answer + (offset === 0 ? (Math.random() > 0.5 ? 1 : -1) : offset)
    if (wrong !== answer && wrong > 0) wrongSet.add(wrong)
  }

  const options = [...wrongSet, answer].sort(() => Math.random() - 0.5)
  return { display: `${a} ${op} ${b}`, answer, options }
}

export default function QuickMath({ onComplete }) {
  const [phase, setPhase] = useState('ready')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [problem, setProblem] = useState(null)
  const [results, setResults] = useState([])
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [timeLeft, setTimeLeft] = useState(30)
  const [startTime, setStartTime] = useState(null)
  const timerRef = useRef(null)
  const totalQuestions = 5

  const nextQuestion = useCallback((idx) => {
    setProblem(generateProblem(idx))
    setFeedback(null)
    setStartTime(Date.now())
  }, [])

  const startChallenge = () => {
    setPhase('playing')
    setTimeLeft(30)
    nextQuestion(0)
  }

  useEffect(() => {
    if (phase === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timerRef.current)
    }
    if (phase === 'playing' && timeLeft <= 0) {
      finishChallenge()
    }
  }, [phase, timeLeft])

  const handleAnswer = (option) => {
    if (feedback) return
    const elapsed = Date.now() - startTime
    const correct = option === problem.answer
    setFeedback(correct ? 'correct' : 'wrong')

    const newResults = [...results, { correct, time: elapsed }]
    setResults(newResults)

    setTimeout(() => {
      if (questionIdx + 1 < totalQuestions) {
        const next = questionIdx + 1
        setQuestionIdx(next)
        nextQuestion(next)
      } else {
        finishChallenge(newResults)
      }
    }, 600)
  }

  const finishChallenge = (finalResults) => {
    clearTimeout(timerRef.current)
    const res = finalResults || results
    const correctCount = res.filter(r => r.correct).length
    const avgTime = res.length > 0 ? res.reduce((a, r) => a + r.time, 0) / res.length : 5000
    // Score: 60% accuracy, 40% speed
    const accuracyScore = (correctCount / totalQuestions) * 60
    const speedScore = Math.max(0, (1 - avgTime / 5000)) * 40
    const score = Math.min(100, Math.round(accuracyScore + speedScore))
    setPhase('done')
    setTimeout(() => onComplete(score), 300)
  }

  if (phase === 'ready') {
    return (
      <div className="assess-challenge-area">
        <motion.div className="assess-ready-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="assess-ready-icon">⚡</div>
          <h3>Rapid Computation</h3>
          <p>Solve 5 math problems as fast as you can. Speed + accuracy both count!</p>
          <button className="btn-primary assess-start-btn" onClick={startChallenge}>
            Start Calculating
          </button>
        </motion.div>
      </div>
    )
  }

  if (phase === 'playing' && problem) {
    return (
      <div className="assess-challenge-area">
        <div className="assess-recall-header">
          <div className="math-question-counter">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <span key={i} className={`q-dot ${i < questionIdx ? 'done' : ''} ${i === questionIdx ? 'active' : ''}`} />
            ))}
          </div>
          <div className="assess-timer-badge">
            <span className={`timer-num ${timeLeft <= 8 ? 'danger' : ''}`}>{timeLeft}s</span>
          </div>
        </div>

        <motion.div
          key={questionIdx}
          className="math-assess-problem"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {problem.display} = ?
        </motion.div>

        <div className="math-assess-options">
          {problem.options.map((opt, i) => (
            <motion.button
              key={`${questionIdx}-${i}`}
              className={`math-assess-option ${feedback && opt === problem.answer ? 'correct' : ''} ${feedback === 'wrong' && opt !== problem.answer && feedback ? '' : ''}`}
              onClick={() => handleAnswer(opt)}
              whileTap={{ scale: 0.94 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              disabled={!!feedback}
            >
              {opt}
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  return null
}
