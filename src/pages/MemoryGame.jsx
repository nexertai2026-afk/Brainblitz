import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { saveScore } from '../lib/scores'

// ===================== LEVEL CONFIG =====================
const LEVELS = {
  1: { cols: 3, rows: 2, pairs: 3, flash: 3, par: 15, label: 'Beginner', type: 'emoji' },
  2: { cols: 4, rows: 3, pairs: 6, flash: 2.5, par: 30, label: 'Easy', type: 'emoji' },
  3: { cols: 4, rows: 4, pairs: 8, flash: 2, par: 45, label: 'Medium', type: 'colorshape' },
  4: { cols: 5, rows: 4, pairs: 10, flash: 1.5, par: 60, label: 'Hard', type: 'math' },
  5: { cols: 6, rows: 4, pairs: 12, flash: 1, par: 75, label: 'Expert', type: 'abstract' },
}

// ===================== CARD POOLS =====================
const EMOJIS = ['🐶','🐱','🐸','🦊','🐼','🦄','🐙','🦋','🌟','🍀','🎯','🔮','🌺','🎪','🚀','🎸']

const SHAPES = [
  { sym: '●', c: '#f43f5e', n: 'Red ●' }, { sym: '●', c: '#3b82f6', n: 'Blue ●' },
  { sym: '●', c: '#10b981', n: 'Green ●' }, { sym: '■', c: '#f43f5e', n: 'Red ■' },
  { sym: '■', c: '#3b82f6', n: 'Blue ■' }, { sym: '■', c: '#f59e0b', n: 'Gold ■' },
  { sym: '▲', c: '#8b5cf6', n: 'Purple ▲' }, { sym: '▲', c: '#10b981', n: 'Green ▲' },
  { sym: '◆', c: '#f59e0b', n: 'Gold ◆' }, { sym: '◆', c: '#8b5cf6', n: 'Purple ◆' },
  { sym: '★', c: '#f43f5e', n: 'Red ★' }, { sym: '★', c: '#3b82f6', n: 'Blue ★' },
]

const MATHS = [
  { q: '2+3', a: '5' }, { q: '4×2', a: '8' }, { q: '3²', a: '9' },
  { q: '6+5', a: '11' }, { q: '3×4', a: '12' }, { q: '8+6', a: '14' },
  { q: '5×3', a: '15' }, { q: '20−3', a: '17' }, { q: '9+10', a: '19' },
  { q: '7×3', a: '21' }, { q: '5²', a: '25' }, { q: '9×3', a: '27' },
]

const ABSTRACTS = ['⬡','⬢','◈','◇','△','▽','◻','◆','○','●','☆','★']

// ===================== HELPERS =====================
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeCards(level, pattern) {
  const cfg = LEVELS[level]
  let raw = []

  if (cfg.type === 'emoji') {
    shuffle(EMOJIS).slice(0, cfg.pairs).forEach((e, i) => {
      raw.push({ mid: i, display: e, type: 'emoji' }, { mid: i, display: e, type: 'emoji' })
    })
  } else if (cfg.type === 'colorshape') {
    shuffle(SHAPES).slice(0, cfg.pairs).forEach((s, i) => {
      const d = { mid: i, display: s.sym, color: s.c, label: s.n, type: 'colorshape' }
      raw.push({ ...d }, { ...d })
    })
  } else if (cfg.type === 'math') {
    shuffle(MATHS).slice(0, cfg.pairs).forEach((m, i) => {
      raw.push({ mid: i, display: m.q, type: 'math', isQ: true }, { mid: i, display: m.a, type: 'math', isQ: false })
    })
  } else {
    shuffle(ABSTRACTS).slice(0, cfg.pairs).forEach((s, i) => {
      raw.push({ mid: i, display: s, type: 'abstract' }, { mid: i, display: s, type: 'abstract' })
    })
  }

  if (pattern) {
    const groups = {}
    raw.forEach(c => { if (!groups[c.mid]) groups[c.mid] = []; groups[c.mid].push(c) })
    const ordered = new Array(raw.length)
    Object.values(groups).forEach((pair, i) => {
      ordered[i] = pair[0]
      ordered[raw.length - 1 - i] = pair[1]
    })
    return ordered.map((c, i) => ({ ...c, id: i, flipped: false, matched: false }))
  }

  return shuffle(raw).map((c, i) => ({ ...c, id: i, flipped: false, matched: false }))
}

function renderCard(card) {
  if (card.type === 'colorshape') {
    return (
      <div className="nr-cs">
        <span className="nr-cs-sym" style={{ color: card.color }}>{card.display}</span>
        <span className="nr-cs-name">{card.label}</span>
      </div>
    )
  }
  if (card.type === 'math') {
    return <span className={`nr-math ${card.isQ ? 'q' : 'a'}`}>{card.display}</span>
  }
  if (card.type === 'abstract') {
    return <span className="nr-abstract">{card.display}</span>
  }
  return <span className="nr-emoji">{card.display}</span>
}

function getTip(acc, spd, mem) {
  if (mem < 50) return '💡 Try chunking — group cards by position during the flash phase.'
  if (spd < 50) return '💡 Focus on spatial positions on the grid, not just card content.'
  if (acc < 60) return '💡 Slow down and be deliberate. Each wrong guess costs accuracy.'
  if (acc > 90 && spd > 80) return '🏆 Outstanding! Exceptional visual-spatial memory detected.'
  if (acc > 85) return '✨ Great accuracy! Push yourself with a harder level.'
  return '👍 Solid performance. Practice builds stronger neural pathways!'
}

// ===================== COMPONENT =====================
export default function MemoryGame() {
  const { updateScore, logSession } = useScore()
  const { user, refreshProfile } = useAuthContext()

  // Core state
  const [level, setLevel] = useState(1)
  const [phase, setPhase] = useState('start') // start | encoding | playing | levelup | done
  const [cards, setCards] = useState([])
  const [selected, setSelected] = useState([])
  const [moves, setMoves] = useState(0)
  const [wrongMoves, setWrongMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [time, setTime] = useState(0)
  const [encTime, setEncTime] = useState(0)
  const [patternMode, setPatternMode] = useState(false)

  // Tracking
  const [firstTries, setFirstTries] = useState(0)
  const [streak, setStreak] = useState(0)
  const [topStreak, setTopStreak] = useState(0)
  const [recalls, setRecalls] = useState([])
  const [flipT, setFlipT] = useState(null)
  const [seen, setSeen] = useState(new Set())
  const [patternAt, setPatternAt] = useState(null)
  const [maxLevel, setMaxLevel] = useState(1)

  // Animations
  const [burstIds, setBurstIds] = useState([])
  const [shakeIds, setShakeIds] = useState([])
  const [showLvlUp, setShowLvlUp] = useState(false)
  const [saved, setSaved] = useState(false)

  const timerRef = useRef(null)
  const encRef = useRef(null)

  // ---- Game timer ----
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  // ---- Encoding countdown ----
  useEffect(() => {
    if (phase !== 'encoding') return
    const flash = LEVELS[level].flash * 1000
    setEncTime(LEVELS[level].flash)
    const t0 = Date.now()
    encRef.current = setInterval(() => {
      const left = Math.max(0, (flash - (Date.now() - t0)) / 1000)
      setEncTime(Math.round(left * 10) / 10)
      if (left <= 0) {
        clearInterval(encRef.current)
        setCards(prev => prev.map(c => ({ ...c, flipped: false })))
        setPhase('playing')
      }
    }, 50)
    return () => clearInterval(encRef.current)
  }, [phase, level])

  // ---- Level complete check ----
  useEffect(() => {
    if (phase !== 'playing' || matches === 0) return
    const cfg = LEVELS[level]
    if (!cfg || matches < cfg.pairs) return

    clearInterval(timerRef.current)
    const wrongPct = moves > 0 ? wrongMoves / moves : 0

    if (wrongPct < 0.2 && level < 5) {
      const next = level + 1
      setMaxLevel(h => Math.max(h, next))
      setShowLvlUp(true)
      setPhase('levelup')
      setTimeout(() => {
        setShowLvlUp(false)
        setLevel(next)
        setMoves(0)
        setWrongMoves(0)
        setMatches(0)
        setSelected([])
        setSeen(new Set())
        setStreak(0)
        const nc = makeCards(next, patternMode && next >= 3)
        setCards(nc.map(c => ({ ...c, flipped: true })))
        setPhase('encoding')
      }, 2200)
    } else {
      setMaxLevel(h => Math.max(h, level))
      setPhase('done')
    }
  }, [matches])

  // ---- Save score on done ----
  useEffect(() => {
    if (phase !== 'done' || saved) return
    setSaved(true)
    const cfg = LEVELS[level]
    const acc = Math.round(Math.max(0, (1 - wrongMoves / Math.max(moves, 1)) * 100))
    const spd = Math.round(Math.max(0, 100 - (time / cfg.par) * 100))
    const mem = Math.round((firstTries / Math.max(cfg.pairs, 1)) * 100)
    const fin = Math.round(acc * 0.3 + spd * 0.3 + mem * 0.4)
    const xp = Math.max(10, Math.round(fin * level))

    updateScore('memory', xp)
    logSession({ game: 'memory', score: xp, accuracy: acc, duration: time, difficulty: level })
    if (user) {
      saveScore(user.id, { game_name: 'Neural Recall', score: xp, difficulty: level, duration_seconds: time })
        .then(() => refreshProfile())
    }
  }, [phase])

  // ---- Start game ----
  const startGame = (lv = 1) => {
    setLevel(lv)
    setMoves(0); setWrongMoves(0); setMatches(0); setTime(0)
    setFirstTries(0); setTopStreak(0); setRecalls([])
    setPatternAt(null); setMaxLevel(lv); setSelected([])
    setSeen(new Set()); setStreak(0); setSaved(false)
    const nc = makeCards(lv, patternMode && lv >= 3)
    setCards(nc.map(c => ({ ...c, flipped: true })))
    setPhase('encoding')
  }

  // ---- Card click ----
  const handleClick = (idx) => {
    if (phase !== 'playing' || selected.length >= 2) return
    const card = cards[idx]
    if (card.flipped || card.matched) return

    const now = Date.now()
    if (selected.length === 0) setFlipT(now)

    setCards(prev => prev.map((c, i) => i === idx ? { ...c, flipped: true } : c))
    const newSel = [...selected, idx]
    setSelected(newSel)
    setSeen(prev => new Set([...prev, idx]))

    if (newSel.length === 2) {
      setMoves(m => m + 1)
      const [a, b] = newSel

      if (cards[a].mid === cards[b].mid) {
        // ✓ CORRECT MATCH
        const rt = flipT ? (now - flipT) / 1000 : 0
        setRecalls(prev => [...prev, rt])
        if (!seen.has(a) || !seen.has(b)) setFirstTries(c => c + 1)
        setStreak(s => { const n = s + 1; setTopStreak(t => Math.max(t, n)); return n })

        if (patternMode && level >= 3 && !patternAt) {
          if (b === cards.length - 1 - a || a === cards.length - 1 - b) setPatternAt(moves + 1)
        }

        setBurstIds([a, b])
        setTimeout(() => setBurstIds([]), 700)
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, matched: true } : c))
          setMatches(m => m + 1)
          setSelected([])
        }, 500)
      } else {
        // ✗ WRONG MATCH
        setWrongMoves(w => w + 1)
        setStreak(0)
        setShakeIds([a, b])
        setTimeout(() => setShakeIds([]), 600)
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, flipped: false } : c))
          setSelected([])
        }, 900)
      }
    }
  }

  // ---- Computed scores for display ----
  const cfg = LEVELS[level] || LEVELS[1]
  const acc = Math.round(Math.max(0, (1 - wrongMoves / Math.max(moves, 1)) * 100))
  const spd = Math.round(Math.max(0, 100 - (time / cfg.par) * 100))
  const mem = Math.round((firstTries / Math.max(cfg.pairs, 1)) * 100)
  const fin = Math.round(acc * 0.3 + spd * 0.3 + mem * 0.4)
  const xp = Math.max(10, Math.round(fin * level))
  const avgR = recalls.length > 0 ? (recalls.reduce((a, b) => a + b, 0) / recalls.length).toFixed(1) : '—'

  // ===================== RENDER =====================
  return (
    <div className="game-page neural-recall fade-in" style={{ '--nr-hue': 220 + (level - 1) * 15 }}>

      {/* Level Up Overlay */}
      {showLvlUp && (
        <div className="nr-lvlup-overlay">
          <div className="nr-lvlup-flash" />
          <div className="nr-lvlup-text">LEVEL UP</div>
          <div className="nr-lvlup-sub">Level {level + 1} — {LEVELS[level + 1]?.label}</div>
        </div>
      )}

      {/* Header */}
      <div className="game-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="game-stats">
          <div className="stat-box"><div className="label">Level</div><div className="value">{level}</div></div>
          <div className="stat-box"><div className="label">Moves</div><div className="value">{moves}</div></div>
          <div className="stat-box"><div className="label">Pairs</div><div className="value">{matches}/{cfg.pairs}</div></div>
          <div className="stat-box"><div className="label">Time</div><div className="value">{time}s</div></div>
        </div>
      </div>

      <div className="game-area">

        {/* =============== START SCREEN =============== */}
        {phase === 'start' && (
          <div className="result-screen">
            <div className="result-emoji">🧠</div>
            <h2 className="game-title">Neural Recall</h2>
            <p className="game-subtitle">
              Scientific visual memory test. Cards flash briefly — memorize positions, then find all pairs from memory.
            </p>
            <div className="nr-levels">
              {[1, 2, 3, 4, 5].map(lv => (
                <button key={lv} className={`nr-lv-btn ${lv === level ? 'active' : ''}`} onClick={() => setLevel(lv)}>
                  <div className="nr-lv-num">Lv.{lv}</div>
                  <div className="nr-lv-name">{LEVELS[lv].label}</div>
                  <div className="nr-lv-info">{LEVELS[lv].cols}×{LEVELS[lv].rows} · {LEVELS[lv].flash}s</div>
                </button>
              ))}
            </div>
            {level >= 3 && (
              <label className="nr-pattern-toggle">
                <input type="checkbox" checked={patternMode} onChange={e => setPatternMode(e.target.checked)} />
                <span className="nr-pt-label">🧩 Pattern Mode</span>
                <span className="nr-pt-hint">Cards follow a hidden pattern — discover it for bonus insight</span>
              </label>
            )}
            <button className="btn-primary" onClick={() => startGame(level)} style={{ marginTop: 20 }}>
              Begin Challenge
            </button>
          </div>
        )}

        {/* =============== ENCODING PHASE =============== */}
        {phase === 'encoding' && (
          <>
            <div className="nr-enc-banner">
              <span className="nr-enc-eye">👁️</span>
              <span className="nr-enc-label">Memorize!</span>
              <span className="nr-enc-time">{encTime.toFixed(1)}s</span>
              <div className="nr-enc-bar">
                <div className="nr-enc-fill" style={{ width: `${(encTime / cfg.flash) * 100}%` }} />
              </div>
            </div>
            <div className="nr-grid" style={{ '--cols': cfg.cols }}>
              {cards.map(card => (
                <div key={card.id} className="nr-card encoding">
                  <div className="nr-card-inner flipped">
                    <div className="nr-card-front">?</div>
                    <div className="nr-card-back">{renderCard(card)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* =============== PLAYING / LEVELUP =============== */}
        {(phase === 'playing' || phase === 'levelup') && (
          <div className={`nr-grid ${phase === 'levelup' ? 'nr-dimmed' : ''}`} style={{ '--cols': cfg.cols }}>
            {cards.map((card, i) => (
              <div
                key={card.id}
                className={`nr-card ${card.matched ? 'matched' : ''} ${burstIds.includes(i) ? 'burst' : ''} ${shakeIds.includes(i) ? 'shake' : ''}`}
                onClick={() => handleClick(i)}
              >
                <div className={`nr-card-inner ${(card.flipped || card.matched) ? 'flipped' : ''}`}>
                  <div className="nr-card-front">?</div>
                  <div className="nr-card-back">{renderCard(card)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =============== RESULTS SCREEN =============== */}
        {phase === 'done' && (
          <div className="result-screen nr-results">
            <div className="result-emoji">{fin >= 80 ? '🏆' : fin >= 60 ? '🌟' : '💪'}</div>
            <div className="result-label">Neural Recall — Level {maxLevel}</div>
            <div className="result-score">{xp} XP</div>
            <div className="nr-badge">{LEVELS[maxLevel]?.label}</div>

            {/* Score Breakdown Bars */}
            <div className="nr-breakdown">
              <div className="nr-bar-row">
                <span className="nr-bar-label">🎯 Accuracy</span>
                <div className="nr-bar-track"><div className="nr-bar-fill acc" style={{ width: `${acc}%` }} /></div>
                <span className="nr-bar-val">{acc}</span>
              </div>
              <div className="nr-bar-row">
                <span className="nr-bar-label">⚡ Speed</span>
                <div className="nr-bar-track"><div className="nr-bar-fill spd" style={{ width: `${Math.max(0, spd)}%` }} /></div>
                <span className="nr-bar-val">{Math.max(0, spd)}</span>
              </div>
              <div className="nr-bar-row">
                <span className="nr-bar-label">🧠 Memory</span>
                <div className="nr-bar-track"><div className="nr-bar-fill mem" style={{ width: `${mem}%` }} /></div>
                <span className="nr-bar-val">{mem}</span>
              </div>
              <div className="nr-bar-row final">
                <span className="nr-bar-label">📊 Final</span>
                <div className="nr-bar-track"><div className="nr-bar-fill fin" style={{ width: `${fin}%` }} /></div>
                <span className="nr-bar-val">{fin}/100</span>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="nr-detail-grid">
              <div className="nr-detail"><div className="nr-d-val">{firstTries}/{cfg.pairs}</div><div className="nr-d-label">First-Try Matches</div></div>
              <div className="nr-detail"><div className="nr-d-val">{topStreak}</div><div className="nr-d-label">Longest Streak</div></div>
              <div className="nr-detail"><div className="nr-d-val">{avgR}s</div><div className="nr-d-label">Avg Recall Time</div></div>
              <div className="nr-detail"><div className="nr-d-val">{time}s</div><div className="nr-d-label">Total Time</div></div>
            </div>

            {/* Memory Type Badges */}
            <div className="nr-mem-types">
              <span className="nr-mem-tag">Visual Short-Term Memory</span>
              {level >= 4 && <span className="nr-mem-tag">Working Memory</span>}
              {patternMode && <span className="nr-mem-tag">Pattern Recognition</span>}
            </div>

            {/* Pattern Result */}
            {patternMode && level >= 3 && (
              <div className="nr-pattern-result">
                {patternAt
                  ? `🧩 Pattern discovered at move ${patternAt}! Top ${Math.max(5, 50 - patternAt * 3)}% of players.`
                  : '🧩 Hidden pattern: matching pairs were in mirror positions. Try spotting it next time!'}
              </div>
            )}

            {/* Performance Tip */}
            <div className="nr-tip">{getTip(acc, spd, mem)}</div>

            <div className="result-actions">
              <button className="btn-primary" onClick={() => startGame(level)}>Play Again</button>
              <button className="btn-secondary" onClick={() => setPhase('start')}>Change Level</button>
              <Link to="/" className="btn-secondary">Home</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
