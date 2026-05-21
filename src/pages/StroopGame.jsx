import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { saveScore } from '../lib/scores'
import { getAdaptiveDifficulty } from '../utils/analytics'
import { useBrainEngine } from '../hooks/useBrainEngine'

const COLORS_MAP = {
  RED: '#f43f5e',
  BLUE: '#3b82f6',
  GREEN: '#10b981',
  YELLOW: '#f59e0b',
  PURPLE: '#8b5cf6',
  ORANGE: '#f97316',
  PINK: '#ec4899',
  CYAN: '#06b6d4',
}
const COLOR_NAMES = Object.keys(COLORS_MAP)

// ─── DIFFICULTY CONFIG ────────────────────────
const DIFFICULTY_CONFIG = {
  1: {
    label: 'Warm Up',
    description: 'Name the ink color',
    incongruentChance: 0.5,
    distractorCount: 3,
    timePerRound: 4000,
    totalTime: 45,
    totalRounds: 15,
    showBackground: false,
    rotateText: false,
    mirrorText: false,
    multiLayer: false,
    scorePerCorrect: 10,
  },
  2: {
    label: 'Focused',
    description: 'Name the INK color — ignore the word!',
    incongruentChance: 0.75,
    distractorCount: 4,
    timePerRound: 3000,
    totalTime: 40,
    totalRounds: 20,
    showBackground: true,   // background color alag hoga
    rotateText: false,
    mirrorText: false,
    multiLayer: false,
    scorePerCorrect: 15,
  },
  3: {
    label: 'Interference',
    description: 'Background misleads you — name the TEXT color!',
    incongruentChance: 0.85,
    distractorCount: 4,
    timePerRound: 2500,
    totalTime: 35,
    totalRounds: 20,
    showBackground: true,
    rotateText: false,
    mirrorText: true,       // text mirror/flip hoga
    multiLayer: false,
    scorePerCorrect: 20,
  },
  4: {
    label: 'Chaos Mode',
    description: 'Rotated, mirrored, layered — still name the ink!',
    incongruentChance: 1.0,
    distractorCount: 5,
    timePerRound: 2000,
    totalTime: 30,
    totalRounds: 20,
    showBackground: true,
    rotateText: true,       // text rotate hoga
    mirrorText: true,
    multiLayer: true,       // 2 words overlap honge
    scorePerCorrect: 30,
  },
  5: {
    label: 'Nightmare',
    description: 'Everything is a lie. Find the truth.',
    incongruentChance: 1.0,
    distractorCount: 6,
    timePerRound: 1500,
    totalTime: 25,
    totalRounds: 25,
    showBackground: true,
    rotateText: true,
    mirrorText: true,
    multiLayer: true,
    scorePerCorrect: 50,
  },
}

// ─── TRIAL GENERATOR ─────────────────────────
function genTrial(difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[1]

  // Correct ink color — ye answer hai
  const ink = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)]

  // Word — ink se alag hoga (incongruent)
  let word
  if (Math.random() < config.incongruentChance) {
    do { word = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)] } while (word === ink)
  } else {
    word = ink
  }

  // Background color — ink aur word dono se alag
  let bgColor = null
  if (config.showBackground) {
    do { bgColor = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)] }
    while (bgColor === ink || bgColor === word)
  }

  // Ghost word — multiLayer mein ek aur confusing word
  let ghostWord = null
  let ghostInk = null
  if (config.multiLayer) {
    do { ghostWord = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)] } while (ghostWord === word)
    do { ghostInk = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)] } while (ghostInk === ink)
  }

  // Rotation angle
  const rotation = config.rotateText
    ? [-25, -15, 15, 25, 180, -180][Math.floor(Math.random() * 6)]
    : 0

  // Mirror
  const mirror = config.mirrorText && Math.random() > 0.4

  // Options generate karo
  const opts = new Set([ink])
  // Traps: word color add karo as distractor
  opts.add(word)
  if (bgColor) opts.add(bgColor)
  while (opts.size < Math.min(config.distractorCount + 1, COLOR_NAMES.length)) {
    opts.add(COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)])
  }

  return {
    word,
    ink,
    bgColor,
    ghostWord,
    ghostInk,
    rotation,
    mirror,
    options: [...opts].sort(() => Math.random() - 0.5),
    answer: ink,
  }
}

// ─── COMBO SYSTEM ────────────────────────────
const COMBO_LABELS = ['', '', '🔥 x2', '⚡ x3', '💥 x4', '🌟 x5', '👑 UNSTOPPABLE']

const TOTAL_TIME = 35
const TOTAL_ROUNDS = 20

export default function StroopGame() {
  const { updateScore, analytics, logSession } = useScore()
  const { user, refreshProfile } = useAuthContext()
  const { recordReactionClick, getBrainAnalysis, getFinalScore, incrementGamesPlayed, resetSession, wasmReady } = useBrainEngine()

  const [phase, setPhase] = useState('start')
  const [difficulty, setDifficulty] = useState(1)
  const [trial, setTrial] = useState(null)
  const [round, setRound] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [score, setScoreVal] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [showCombo, setShowCombo] = useState(false)
  const [trialTimeLeft, setTrialTimeLeft] = useState(100) // percentage for trial timer
  const [brainAnalysis, setBrainAnalysis] = useState(null)

  const timerRef = useRef(null)
  const trialTimerRef = useRef(null)
  const startTimeRef = useRef(0)
  const trialStartRef = useRef(0)
  const roundRef = useRef(0)

  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[1]

  const start = () => {
    const diff = Math.min(5, Math.max(1, getAdaptiveDifficulty(analytics, 'stroop')))
    setDifficulty(diff)
    setPhase('playing')
    setRound(0); roundRef.current = 0
    setCorrect(0); setWrong(0); setScoreVal(0)
    setCombo(0); setMaxCombo(0)
    setTimeLeft(DIFFICULTY_CONFIG[diff]?.totalTime || TOTAL_TIME)
    setFeedback(null)
    setTrial(genTrial(diff))
    resetSession()
    startTimeRef.current = Date.now()
    trialStartRef.current = performance.now()
  }

  // Main countdown timer
  useEffect(() => {
    if (phase === 'playing') {
      const totalTime = config.totalTime
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); endGame(); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  // Trial timer bar (visual only)
  useEffect(() => {
    if (phase !== 'playing' || !trial) return
    trialStartRef.current = performance.now()
    setTrialTimeLeft(100)

    const interval = 50 // ms
    trialTimerRef.current = setInterval(() => {
      const elapsed = performance.now() - trialStartRef.current
      const pct = Math.max(0, 100 - (elapsed / config.timePerRound) * 100)
      setTrialTimeLeft(pct)

      // Time out on trial → auto wrong
      if (pct <= 0) {
        clearInterval(trialTimerRef.current)
        handleTimeout()
      }
    }, interval)

    return () => clearInterval(trialTimerRef.current)
  }, [trial, phase])

  const handleTimeout = () => {
    if (feedback) return
    setWrong(w => w + 1)
    setCombo(0)
    setFeedback('timeout')
    setTimeout(() => {
      setFeedback(null)
      nextTrial()
    }, 400)
  }

  const endGame = () => {
    clearInterval(trialTimerRef.current)
    setPhase('done')
  }

  const nextTrial = () => {
    const newRound = roundRef.current + 1
    roundRef.current = newRound
    setRound(newRound)
    if (newRound >= config.totalRounds) {
      endGame()
      return
    }
    setTrial(genTrial(difficulty))
  }

  const answer = (color) => {
    if (feedback) return
    clearInterval(trialTimerRef.current)

    const reactionTime = performance.now() - trialStartRef.current
    const isCorrect = color === trial.answer

    // WASM brain tracking
    recordReactionClick(performance.now(), isCorrect, COLOR_NAMES.indexOf(color))

    if (isCorrect) {
      const newCombo = combo + 1
      setCombo(newCombo)
      setMaxCombo(m => Math.max(m, newCombo))

      // Combo multiplier
      const comboMult = newCombo >= 5 ? 2.0 : newCombo >= 3 ? 1.5 : newCombo >= 2 ? 1.2 : 1.0
      // Speed bonus
      const speedBonus = reactionTime < 800 ? 1.3 : reactionTime < 1500 ? 1.1 : 1.0
      const pts = Math.round(config.scorePerCorrect * comboMult * speedBonus)

      setCorrect(c => c + 1)
      setScoreVal(s => s + pts)
      setFeedback('correct')

      if (newCombo >= 2) {
        setShowCombo(true)
        setTimeout(() => setShowCombo(false), 800)
      }
    } else {
      setCombo(0)
      setWrong(w => w + 1)
      setFeedback('wrong')
    }

    setTimeout(() => {
      setFeedback(null)
      nextTrial()
    }, 300)
  }

  // Game done effect
  useEffect(() => {
    if (phase === 'done') {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      const totalRounds = roundRef.current
      const accuracy = totalRounds > 0 ? (correct / totalRounds) * 100 : 0

      // WASM final score
      incrementGamesPlayed()
      const finalScore = wasmReady ? getFinalScore(score, 0, difficulty / 5, maxCombo === totalRounds) : score
      const analysis = getBrainAnalysis()
      setBrainAnalysis(analysis)

      updateScore('stroop', Math.round(finalScore))
      logSession({
        game: 'stroop',
        score: Math.round(finalScore),
        accuracy,
        difficulty,
        duration,
      })

      if (user) {
        saveScore(user.id, {
          game_name: 'Inhibition Protocol',
          score: Math.round(finalScore),
          difficulty,
          duration_seconds: duration,
        }).then(() => refreshProfile())
      }
    }
  }, [phase])

  const totalTime = config.totalTime
  const pct = (timeLeft / totalTime) * 100
  const barClass = pct < 20 ? 'danger' : pct < 50 ? 'warning' : ''
  const totalRounds = roundRef.current

  return (
    <div className="game-page fade-in">
      <div className="game-header">
        <Link to="/" className="back-btn">← Back</Link>
        {phase === 'playing' && (
          <div className="game-stats">
            <div className="stat-box"><div className="label">Score</div><div className="value">{score}</div></div>
            <div className="stat-box"><div className="label">Round</div><div className="value">{round}/{config.totalRounds}</div></div>
            <div className="stat-box"><div className="label">Accuracy</div><div className="value">{round > 0 ? Math.round((correct / round) * 100) : 100}%</div></div>
            <div className="stat-box"><div className="label">Combo</div><div className="value" style={{ color: combo >= 3 ? '#f59e0b' : 'inherit' }}>🔥{combo}</div></div>
          </div>
        )}
      </div>

      <div className="game-area">

        {/* ── START SCREEN ── */}
        {phase === 'start' && (
          <div className="result-screen">
            <div className="result-emoji">🌈</div>
            <h2 className="game-title">Stroop Challenge</h2>
            <p className="game-subtitle">Name the <strong>INK COLOR</strong> — not the word, not the background!</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0', textAlign: 'left', maxWidth: 320 }}>
              {Object.entries(DIFFICULTY_CONFIG).map(([lvl, cfg]) => (
                <div key={lvl} style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)'
                }}>
                  <strong style={{ color: '#fff' }}>Level {lvl} — {cfg.label}:</strong> {cfg.description}
                </div>
              ))}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>
              🧠 Adaptive difficulty — adjusts to your brain!
            </p>
            <button className="btn-primary" onClick={start}>Start Challenge</button>
          </div>
        )}

        {/* ── PLAYING ── */}
        {phase === 'playing' && trial && (
          <>
            {/* Main timer */}
            <div className="timer-bar-container">
              <div className={`timer-bar ${barClass}`} style={{ width: `${pct}%` }} />
            </div>

            {/* Trial timer */}
            <div style={{
              height: 3,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4,
              marginBottom: '0.5rem',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${trialTimeLeft}%`,
                background: trialTimeLeft < 30 ? '#ef4444' : '#6366f1',
                transition: 'width 0.05s linear, background 0.3s',
                borderRadius: 4,
              }} />
            </div>

            <p className="game-subtitle" style={{ marginBottom: '0.5rem' }}>
              {config.description}
              <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Level {difficulty} — {config.label}
              </span>
            </p>

            {/* STROOP WORD DISPLAY */}
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
              marginBottom: '1rem',
            }}>
              {/* Ghost word (multiLayer) */}
              {trial.ghostWord && (
                <div style={{
                  position: 'absolute',
                  color: COLORS_MAP[trial.ghostInk],
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  opacity: 0.25,
                  transform: `rotate(${-trial.rotation}deg) translate(8px, 8px)`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                  letterSpacing: 2,
                }}>
                  {trial.ghostWord}
                </div>
              )}

              {/* Main word */}
              <div
                className="stroop-word"
                style={{
                  color: COLORS_MAP[trial.ink],
                  backgroundColor: trial.bgColor
                    ? COLORS_MAP[trial.bgColor] + '33'
                    : 'transparent',
                  padding: trial.bgColor ? '0.5rem 1.5rem' : 0,
                  borderRadius: trial.bgColor ? 12 : 0,
                  transform: `rotate(${trial.rotation}deg) scaleX(${trial.mirror ? -1 : 1})`,
                  transition: 'transform 0.1s',
                  display: 'inline-block',
                  position: 'relative',
                  zIndex: 1,
                  textShadow: trial.bgColor
                    ? `0 0 20px ${COLORS_MAP[trial.bgColor]}88`
                    : 'none',
                }}
              >
                {trial.word}
              </div>
            </div>

            {/* Combo flash */}
            {showCombo && combo >= 2 && (
              <div style={{
                position: 'fixed',
                top: '35%',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '2rem',
                fontWeight: 900,
                color: '#f59e0b',
                textShadow: '0 0 20px #f59e0b',
                zIndex: 100,
                pointerEvents: 'none',
                animation: 'fadeInUp 0.4s ease',
              }}>
                {COMBO_LABELS[Math.min(combo, COMBO_LABELS.length - 1)]}
              </div>
            )}

            {/* Options */}
            <div className="stroop-options" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.ceil(trial.options.length / 2)}, 1fr)`,
              gap: '0.6rem',
              maxWidth: 480,
              margin: '0 auto',
            }}>
              {trial.options.map(c => (
                <button
                  key={c}
                  className={`stroop-btn ${feedback === 'correct' && c === trial.answer ? 'correct' : ''} ${feedback === 'wrong' && c === trial.answer ? 'correct' : ''} ${feedback === 'wrong' && c !== trial.answer ? 'wrong-option' : ''}`}
                  style={{
                    borderColor: COLORS_MAP[c],
                    color: COLORS_MAP[c],
                    background: feedback && c === trial.answer
                      ? COLORS_MAP[c] + '22'
                      : 'rgba(255,255,255,0.04)',
                    transform: feedback && c === trial.answer ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.15s',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    padding: '0.65rem 0.5rem',
                    borderRadius: 10,
                    border: `2px solid ${COLORS_MAP[c]}`,
                    cursor: feedback ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => answer(c)}
                  disabled={!!feedback}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Feedback flash */}
            {feedback && (
              <div style={{
                textAlign: 'center',
                marginTop: '0.75rem',
                fontSize: '1.5rem',
                fontWeight: 900,
                color: feedback === 'correct' ? '#22c55e' : feedback === 'timeout' ? '#f59e0b' : '#ef4444',
                animation: 'fadeInUp 0.2s ease',
              }}>
                {feedback === 'correct' ? '✓ Correct!' : feedback === 'timeout' ? '⏱ Too slow!' : '✗ Wrong!'}
              </div>
            )}
          </>
        )}

        {/* ── DONE SCREEN ── */}
        {phase === 'done' && (
          <div className="result-screen">
            <div className="result-emoji">
              {correct >= config.totalRounds * 0.85 ? '🏆' : correct >= config.totalRounds * 0.6 ? '🌟' : '💪'}
            </div>
            <div className="result-label">Stroop Score</div>
            <div className="result-score">{score} XP</div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.6rem',
              margin: '1rem 0',
              width: '100%',
              maxWidth: 320,
            }}>
              {[
                { label: 'Correct', value: correct, color: '#22c55e' },
                { label: 'Wrong', value: wrong, color: '#ef4444' },
                { label: 'Accuracy', value: `${totalRounds > 0 ? Math.round((correct / totalRounds) * 100) : 0}%`, color: '#6366f1' },
                { label: 'Max Combo', value: `🔥${maxCombo}`, color: '#f59e0b' },
                { label: 'Difficulty', value: `Lv.${difficulty} ${config.label}`, color: '#8b5cf6' },
                { label: 'Rounds', value: `${totalRounds}`, color: '#06b6d4' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  padding: '0.6rem',
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Brain Analysis */}
            {brainAnalysis && wasmReady && (
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 12,
                padding: '0.85rem',
                marginBottom: '1rem',
                width: '100%',
                maxWidth: 320,
                textAlign: 'left',
              }}>
                <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  🧠 Brain Analysis
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0' }}>
                  ⚡ Reaction: <strong style={{ color: '#fff' }}>{brainAnalysis.reactionTime}ms</strong> — {brainAnalysis.reactionType}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0' }}>
                  🎯 Focus: <strong style={{ color: '#fff' }}>{Math.round(brainAnalysis.focusLevel * 100)}%</strong>
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0' }}>
                  💡 Style: <strong style={{ color: '#fff' }}>{brainAnalysis.cognitivePersonality}</strong>
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0.2rem 0' }}>
                  🧬 Mental Age: <strong style={{ color: '#a5b4fc' }}>{brainAnalysis.mentalAge}</strong>
                </p>
              </div>
            )}

            <div className="result-actions">
              <button className="btn-primary" onClick={start}>Play Again</button>
              <Link to="/" className="btn-secondary">Home</Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}