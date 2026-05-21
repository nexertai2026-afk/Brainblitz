import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { saveScore } from '../lib/scores'

const WORDS = [
  { word: 'PLANET', hint: 'Earth is one' },
  { word: 'GUITAR', hint: 'Musical instrument with strings' },
  { word: 'JUNGLE', hint: 'Dense tropical forest' },
  { word: 'ROCKET', hint: 'Goes to space' },
  { word: 'PUZZLE', hint: 'A game of fitting pieces' },
  { word: 'CASTLE', hint: 'A medieval fortress' },
  { word: 'DRAGON', hint: 'Mythical fire breather' },
  { word: 'PIRATE', hint: 'Sails the seas for treasure' },
  { word: 'FROZEN', hint: 'Very very cold' },
  { word: 'TUNNEL', hint: 'Underground passage' },
  { word: 'BRIDGE', hint: 'Crosses over water' },
  { word: 'SUNSET', hint: 'End of the day sky' },
  { word: 'KNIGHT', hint: 'Wears armor and rides horses' },
  { word: 'SHADOW', hint: 'Dark shape cast by light' },
  { word: 'METEOR', hint: 'Shooting star' },
]

function scramble(w) {
  const a = w.split('')
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.join('') === w ? scramble(w) : a.join('')
}

const TOTAL_TIME = 60

export default function WordScramble() {
  const { updateScore, logSession } = useScore()
  const { user, refreshProfile } = useAuthContext()
  const [phase, setPhase] = useState('start')
  const [wordList, setWordList] = useState([])
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScoreVal] = useState(0)
  const [solved, setSolved] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [showHint, setShowHint] = useState(false)
  const [flash, setFlash] = useState('')
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const start = () => {
    const shuffled = [...WORDS].sort(() => Math.random() - 0.5)
    setWordList(shuffled)
    setIdx(0); setInput(''); setScoreVal(0); setSolved(0)
    setTimeLeft(TOTAL_TIME); setShowHint(false); setFlash('')
    setPhase('playing')
  }

  useEffect(() => {
    if (phase === 'playing') {
      inputRef.current?.focus()
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); setPhase('done'); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  useEffect(() => {
    if (phase === 'done') {
      updateScore('word', score)
      logSession({ game: 'word', score, accuracy: idx > 0 ? (solved / idx) * 100 : 0, duration: TOTAL_TIME, difficulty: 1 })

      // Save to Supabase
      if (user) {
        saveScore(user.id, {
          game_name: 'Lexical Decoder',
          score,
          difficulty: 1,
          duration_seconds: TOTAL_TIME,
        }).then(() => refreshProfile())
      }
    }
  }, [phase])

  const submit = (e) => {
    e.preventDefault()
    if (!wordList[idx]) return
    if (input.toUpperCase() === wordList[idx].word) {
      const pts = showHint ? 15 : 25
      setScoreVal(s => s + pts)
      setSolved(s => s + 1)
      setFlash('correct')
      setTimeout(() => { setFlash(''); nextWord() }, 400)
    } else {
      setFlash('wrong')
      setTimeout(() => setFlash(''), 400)
    }
  }

  const nextWord = () => {
    if (idx + 1 >= wordList.length) { setPhase('done'); return }
    setIdx(i => i + 1); setInput(''); setShowHint(false)
    inputRef.current?.focus()
  }

  const skip = () => { nextWord() }
  const current = wordList[idx]
  const pct = (timeLeft / TOTAL_TIME) * 100
  const barClass = pct < 20 ? 'danger' : pct < 50 ? 'warning' : ''

  return (
    <div className="game-page fade-in">
      <div className="game-header">
        <Link to="/" className="back-btn">← Back</Link>
        {phase === 'playing' && (
          <div className="game-stats">
            <div className="stat-box"><div className="label">Score</div><div className="value">{score}</div></div>
            <div className="stat-box"><div className="label">Solved</div><div className="value">{solved}</div></div>
            <div className="stat-box"><div className="label">Time</div><div className="value">{timeLeft}s</div></div>
          </div>
        )}
      </div>
      <div className="game-area">
        {phase === 'start' && (
          <div className="result-screen">
            <div className="result-emoji">📝</div>
            <h2 className="game-title">Word Scramble</h2>
            <p className="game-subtitle">Unscramble the letters to form the correct word!</p>
            <button className="btn-primary" onClick={start}>Start</button>
          </div>
        )}
        {phase === 'playing' && current && (
          <>
            <div className="timer-bar-container"><div className={`timer-bar ${barClass}`} style={{ width: `${pct}%` }} /></div>
            <div className={`word-scramble ${flash}`}>{scramble(current.word)}</div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
              <input ref={inputRef} className="word-input" value={input}
                onChange={e => setInput(e.target.value)} placeholder="Type your answer..."
                autoComplete="off" />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn-primary">Submit</button>
                <button type="button" className="btn-secondary" onClick={() => setShowHint(true)}>Hint</button>
                <button type="button" className="btn-secondary" onClick={skip}>Skip</button>
              </div>
            </form>
            {showHint && <p className="word-hint">💡 {current.hint}</p>}
          </>
        )}
        {phase === 'done' && (
          <div className="result-screen">
            <div className="result-emoji">{score >= 150 ? '🏆' : score >= 75 ? '🌟' : '💪'}</div>
            <div className="result-label">Words Solved: {solved}</div>
            <div className="result-score">{score} XP</div>
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
