import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { saveScore } from '../lib/scores'

// ===================== CONFIG =====================
const LEVELS = {
  1: { time: 30, label: 'Basic', color: '#3b82f6', desc: 'Single-digit add & subtract' },
  2: { time: 30, label: 'Mixed', color: '#10b981', desc: 'Multi-digit, ×, ÷' },
  3: { time: 45, label: 'Memory', color: '#f59e0b', desc: 'Chained ops & missing numbers' },
  4: { time: 45, label: 'Interference', color: '#f43f5e', desc: 'Distractors & comparisons' },
  5: { time: 60, label: 'Speed', color: '#8b5cf6', desc: '3-digit mental arithmetic' },
  6: { time: 60, label: 'Patterns', color: '#ec4899', desc: 'Number sequence recognition' },
}

const DISTRACTORS = ['THREE','SEVEN','TWELVE','EIGHT','FIVE','NINE','TWENTY','FOUR','SIX','TEN','ELEVEN','FIFTEEN']

const FLOAT_DATA = Array.from({ length: 18 }, (_, i) => ({
  n: (i % 9) + 1, x: (i * 5.5 + 2) % 95,
  s: 1.2 + (i % 3) * 0.6, d: 18 + (i % 5) * 6, dl: i * 1.1,
}))

// ===================== MATH HELPERS =====================
function ri(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }
function pick(a) { return a[Math.floor(Math.random() * a.length)] }
function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 }
function sd(a) { if (a.length < 2) return 0; const m = avg(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) }

// ===================== QUESTION GENERATORS =====================
function genQ(lv, used) {
  let q, t = 0
  do { q = rawQ(lv); t++ } while (used.has(q.key) && t < 30)
  return q
}

function rawQ(lv) {
  switch (lv) { case 1: return qL1(); case 2: return qL2(); case 3: return qL3(); case 4: return qL4(); case 5: return qL5(); case 6: return qL6(); default: return qL1() }
}

function qL1() {
  if (Math.random() < 0.5) { const a = ri(1, 9), b = ri(1, 9); return { text: `${a} + ${b}`, answer: a + b, type: 'arith', key: `${a}+${b}` } }
  const a = ri(5, 18), b = ri(1, a - 1); return { text: `${a} − ${b}`, answer: a - b, type: 'arith', key: `${a}-${b}` }
}

function qL2() {
  const r = Math.random()
  if (r < 0.25) { const a = ri(12, 55), b = ri(3, 9); return { text: `${a} + ${b}`, answer: a + b, type: 'arith', key: `${a}+${b}` } }
  if (r < 0.5) { const a = ri(15, 55), b = ri(3, Math.min(9, a - 1)); return { text: `${a} − ${b}`, answer: a - b, type: 'arith', key: `${a}-${b}` } }
  if (r < 0.8) { const a = ri(2, 12), b = ri(2, 12); return { text: `${a} × ${b}`, answer: a * b, type: 'arith', key: `${a}x${b}` } }
  const b = ri(2, 9), ans = ri(2, 12), a = b * ans; return { text: `${a} ÷ ${b}`, answer: ans, type: 'arith', key: `${a}/${b}` }
}

function qL3() {
  const r = Math.random()
  if (r < 0.25) { const a = ri(2, 8), b = ri(1, 6), c = ri(2, 4); return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c, type: 'chain', key: `(${a}+${b})x${c}` } }
  if (r < 0.45) { const a = ri(3, 7), b = ri(2, 5), c = ri(1, Math.min(a * b - 1, 12)); return { text: `${a} × ${b} − ${c}`, answer: a * b - c, type: 'chain', key: `${a}x${b}-${c}` } }
  if (r < 0.65) { const a = ri(2, 6), b = ri(2, 4), c = ri(1, 8); return { text: `${a} × ${b} + ${c}`, answer: a * b + c, type: 'chain', key: `${a}x${b}+${c}` } }
  if (r < 0.85) { const ans = ri(3, 20), b = ri(2, 15); return { text: `? + ${b} = ${ans + b}`, answer: ans, type: 'missing', key: `?+${b}=${ans + b}` } }
  const ans = ri(2, 9), a = ri(2, 9); return { text: `${a} × ? = ${a * ans}`, answer: ans, type: 'missing', key: `${a}x?=${a * ans}` }
}

function qL4() {
  if (Math.random() < 0.5) {
    const a = ri(8, 35), b = ri(5, 25), plus = Math.random() < 0.5
    const bv = plus ? b : Math.min(b, a - 1)
    return { text: `${a} ${plus ? '+' : '−'} ${bv}`, answer: plus ? a + bv : a - bv, type: 'interference', distractor: pick(DISTRACTORS), key: `${a}${plus ? '+' : '-'}${bv}d` }
  }
  let a1, a2, b1, b2
  do { a1 = ri(3, 12); a2 = ri(3, 12); b1 = ri(3, 12); b2 = ri(3, 12) } while (a1 * a2 === b1 * b2)
  return { text: 'Which is larger?', optA: `${a1} × ${a2}`, optB: `${b1} × ${b2}`, answer: a1 * a2 > b1 * b2 ? 0 : 1, type: 'comparison', key: `c${a1}${a2}${b1}${b2}` }
}

function qL5() {
  const r = Math.random()
  if (r < 0.35) { const a = ri(100, 350), b = ri(20, 99); return { text: `${a} + ${b}`, answer: a + b, type: 'arith', key: `${a}+${b}` } }
  if (r < 0.65) { const a = ri(150, 500), b = ri(20, Math.min(a - 10, 150)); return { text: `${a} − ${b}`, answer: a - b, type: 'arith', key: `${a}-${b}` } }
  const a = ri(12, 30), b = ri(3, 9); return { text: `${a} × ${b}`, answer: a * b, type: 'arith', key: `${a}x${b}` }
}

function qL6() {
  const t = ri(0, 3)
  if (t === 0) { const s = ri(1, 12), d = ri(2, 7); const seq = Array.from({ length: 4 }, (_, i) => s + i * d); return { text: seq.join(', ') + ', __', answer: s + 4 * d, type: 'sequence', key: `ap${s}d${d}` } }
  if (t === 1) { const s = ri(1, 4), r = ri(2, 3); const seq = Array.from({ length: 4 }, (_, i) => s * r ** i); return { text: seq.join(', ') + ', __', answer: s * r ** 4, type: 'sequence', key: `gp${s}r${r}` } }
  if (t === 2) { const s = ri(1, 6); const seq = Array.from({ length: 4 }, (_, i) => (s + i) ** 2); return { text: seq.join(', ') + ', __', answer: (s + 4) ** 2, type: 'sequence', key: `sq${s}` } }
  const a = ri(1, 3), b = ri(1, 4); const seq = [a, b]; for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2])
  return { text: seq.slice(0, 5).join(', ') + ', __', answer: seq[5], type: 'sequence', key: `fb${a}${b}` }
}

function getTip(spd, acc, con, pre) {
  const m = Math.min(spd, acc, con, pre)
  if (m === con) return '💡 Your speed varies a lot — try maintaining a steady solving rhythm.'
  if (m === pre) return '💡 You slow down near the end. Practice under time pressure.'
  if (m === acc) return '💡 Slow down slightly — 1 wrong answer costs more than 1 extra second.'
  if (m === spd) return '💡 Great accuracy! Now focus on reducing your solve time.'
  return '👍 Well-rounded performance. Keep training to push all metrics!'
}

// ===================== COMPONENT =====================
export default function MathSprint() {
  const { updateScore, logSession } = useScore()
  const { user, refreshProfile } = useAuthContext()

  const [level, setLevel] = useState(1)
  const [startLvl, setStartLvl] = useState(1)
  const [phase, setPhase] = useState('start')
  const [question, setQuestion] = useState(null)
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [totalTime, setTotalTime] = useState(30)
  const [score, setScoreVal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [wrongAns, setWrongAns] = useState(null)
  const [cc, setCc] = useState(0)
  const [cw, setCw] = useState(0)
  const [showUp, setShowUp] = useState(false)
  const [showDown, setShowDown] = useState(false)
  const [speedMsg, setSpeedMsg] = useState(null)
  const [saved, setSaved] = useState(false)
  const [qLog, setQLog] = useState([])

  const inputRef = useRef('')
  const usedRef = useRef(new Set())
  const qStartRef = useRef(0)
  const fkRef = useRef(null)
  const timerRef = useRef(null)

  // ---- Timer ----
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); setPhase('done'); return 0 } return t - 1 })
      }, 1000)
    } else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // ---- Answer handler (always latest via ref) ----
  const handleAnswerRef = useRef(null)
  const handleAnswer = (ans) => {
    if (feedback) return
    const now = Date.now()
    const isComp = question.type === 'comparison'
    const ok = isComp ? ans === question.answer : parseInt(String(ans), 10) === question.answer
    if (!isComp && isNaN(parseInt(String(ans), 10))) return

    const tt = now - qStartRef.current
    const rt = fkRef.current ? fkRef.current - qStartRef.current : tt
    const st = fkRef.current ? now - fkRef.current : tt
    setQLog(p => [...p, { lv: level, type: question.type, ok, rt, st, tt, tl: timeLeft }])
    setTotal(t => t + 1)

    if (ok) {
      setFeedback('correct')
      const bonus = streak >= 5 ? 20 : streak >= 3 ? 15 : 10
      setScoreVal(s => s + bonus + Math.floor(level * 2))
      setStreak(s => { const n = s + 1; setBestStreak(b => Math.max(b, n)); return n })
      setCorrect(c => c + 1)

      const cLogs = qLog.filter(l => l.ok)
      const a = avg(cLogs.map(l => l.tt))
      if (a > 0 && tt < a * 0.75) setSpeedMsg('⚡ Faster!')
      else if (a > 0 && tt > a * 1.4) setSpeedMsg('⏱️ Take your time')
      else setSpeedMsg(null)

      const ncc = cc + 1
      setCc(ncc); setCw(0)
      if (ncc >= 5 && level < 6) {
        const nl = level + 1
        setLevel(nl); setCc(0); setTimeLeft(t => t + 8)
        setShowUp(true)
        setTimeout(() => { setShowUp(false); setFeedback(null); setSpeedMsg(null); nextQ(nl) }, 1200)
        return
      }
      setTimeout(() => { setFeedback(null); setSpeedMsg(null); nextQ(level) }, 400)
    } else {
      setFeedback('wrong')
      if (!isComp) setWrongAns(question.answer)
      setStreak(0); setSpeedMsg(null)
      const ncw = cw + 1
      setCw(ncw); setCc(0)
      if (ncw >= 3 && level > 1) {
        const pl = level - 1
        setLevel(pl); setCw(0)
        setShowDown(true)
        setTimeout(() => { setShowDown(false); setFeedback(null); setWrongAns(null); nextQ(pl) }, 1200)
        return
      }
      setTimeout(() => { setFeedback(null); setWrongAns(null); nextQ(level) }, 900)
    }
  }
  handleAnswerRef.current = handleAnswer

  // ---- Keypress handler (via ref for stable keyboard listener) ----
  const pressKeyRef = useRef(null)
  pressKeyRef.current = (key) => {
    if (feedback || !question || question.type === 'comparison') return
    if (key === 'back') {
      setInput(p => { const n = p.slice(0, -1); inputRef.current = n; return n })
    } else if (key === 'enter') {
      if (inputRef.current.length > 0) handleAnswerRef.current(inputRef.current)
    } else if (key >= '0' && key <= '9') {
      if (!fkRef.current) fkRef.current = Date.now()
      setInput(p => { if (p.length >= 6) return p; const n = p + key; inputRef.current = n; return n })
    }
  }

  // ---- Keyboard listener ----
  useEffect(() => {
    if (phase !== 'playing') return
    const h = (e) => {
      if (e.key >= '0' && e.key <= '9') pressKeyRef.current(e.key)
      else if (e.key === 'Backspace') { e.preventDefault(); pressKeyRef.current('back') }
      else if (e.key === 'Enter') { e.preventDefault(); pressKeyRef.current('enter') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [phase])

  // ---- Auto-submit ----
  useEffect(() => {
    if (phase !== 'playing' || !question || feedback || question.type === 'comparison') return
    const ansLen = String(question.answer).length
    if (input.length > 0 && input.length === ansLen) {
      const t = setTimeout(() => handleAnswerRef.current?.(inputRef.current), 150)
      return () => clearTimeout(t)
    }
  }, [input, phase, question, feedback])

  // ---- Save on done ----
  useEffect(() => {
    if (phase !== 'done' || saved) return
    setSaved(true)
    const cL = qLog.filter(l => l.ok), sT = cL.map(l => l.tt)
    const spdS = Math.round(Math.max(0, 100 - (avg(sT) / 3000) * 100))
    const accS = Math.round(total > 0 ? (correct / total) * 100 : 0)
    const conS = Math.round(Math.max(0, 100 - sd(sT) / 100))
    const pL = qLog.filter(l => l.tl <= 10), pOk = pL.filter(l => l.ok).length
    const preS = Math.round(pL.length > 0 ? (pOk / pL.length) * 100 : accS)
    const fin = Math.round(spdS * 0.25 + accS * 0.35 + conS * 0.2 + preS * 0.2)
    const xp = Math.max(10, Math.round(fin * (level / 2)))
    updateScore('math', xp)
    logSession({ game: 'math', score: xp, accuracy: accS, duration: totalTime, difficulty: level })
    if (user) saveScore(user.id, { game_name: 'Arithmetic Engine', score: xp, difficulty: level, duration_seconds: totalTime }).then(() => refreshProfile())
  }, [phase])

  const nextQ = (lv) => {
    const q = genQ(lv, usedRef.current)
    usedRef.current.add(q.key)
    setQuestion(q); setInput(''); inputRef.current = ''
    qStartRef.current = Date.now(); fkRef.current = null
  }

  const startGame = (lv) => {
    setLevel(lv); setStartLvl(lv)
    const t = LEVELS[lv].time; setTimeLeft(t); setTotalTime(t)
    setScoreVal(0); setStreak(0); setBestStreak(0); setCorrect(0); setTotal(0)
    setCc(0); setCw(0); setQLog([]); setFeedback(null); setWrongAns(null)
    usedRef.current = new Set(); setSaved(false); setSpeedMsg(null)
    setShowUp(false); setShowDown(false); setInput(''); inputRef.current = ''
    setPhase('playing')
    const q = genQ(lv, new Set()); usedRef.current.add(q.key)
    setQuestion(q); qStartRef.current = Date.now(); fkRef.current = null
  }

  // ---- Computed results ----
  const cL = qLog.filter(l => l.ok), sT = cL.map(l => l.tt)
  const avgMs = avg(sT)
  const spdS = Math.round(Math.max(0, 100 - (avgMs / 3000) * 100))
  const accS = Math.round(total > 0 ? (correct / total) * 100 : 0)
  const conS = Math.round(Math.max(0, 100 - sd(sT) / 100))
  const pL = qLog.filter(l => l.tl <= 10), pOk = pL.filter(l => l.ok).length
  const preS = Math.round(pL.length > 0 ? (pOk / pL.length) * 100 : accS)
  const fin = Math.round(spdS * 0.25 + accS * 0.35 + conS * 0.2 + preS * 0.2)
  const xp = Math.max(10, Math.round(fin * (level / 2)))
  const pct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0
  const isLast10 = timeLeft <= 10 && phase === 'playing'

  // ===================== RENDER =====================
  return (
    <div className="game-page arithmetic-engine fade-in">
      <div className="ae-floating">{FLOAT_DATA.map((f, i) => (
        <span key={i} className="ae-float-num" style={{ left: `${f.x}%`, fontSize: `${f.s}rem`, animationDuration: `${f.d}s`, animationDelay: `${f.dl}s` }}>{f.n}</span>
      ))}</div>

      {showUp && <div className="ae-overlay ae-up"><div className="ae-ov-text">LEVEL UP → L{level}</div><div className="ae-ov-sub">{LEVELS[level]?.label} · +8s bonus</div></div>}
      {showDown && <div className="ae-overlay ae-down"><div className="ae-ov-text">LEVEL DOWN → L{level}</div><div className="ae-ov-sub">{LEVELS[level]?.label}</div></div>}

      <div className="game-header">
        <Link to="/" className="back-btn">← Back</Link>
        {phase === 'playing' && (
          <div className="game-stats">
            <div className="stat-box"><div className="label">Level</div><div className="value" style={{ color: LEVELS[level]?.color }}>{level}</div></div>
            <div className="stat-box"><div className="label">Score</div><div className="value">{score}</div></div>
            <div className="stat-box"><div className="label">Streak</div><div className="value">{streak > 0 ? `🔥${streak}` : '0'}</div></div>
            <div className="stat-box"><div className="label">Time</div><div className={`value ${isLast10 ? 'ae-red-pulse' : ''}`}>{timeLeft}s</div></div>
          </div>
        )}
      </div>

      <div className="game-area">
        {/* ============= START ============= */}
        {phase === 'start' && (
          <div className="result-screen">
            <div className="result-emoji">⚡</div>
            <h2 className="game-title">Arithmetic Engine</h2>
            <p className="game-subtitle">Adaptive math challenge based on numerical cognition research. Type answers on the number pad — auto-submits when correct length is reached.</p>
            <div className="ae-levels">
              {[1, 2, 3, 4, 5, 6].map(lv => (
                <button key={lv} className={`ae-lv-btn ${lv === startLvl ? 'active' : ''}`} onClick={() => setStartLvl(lv)} style={{ '--ae-c': LEVELS[lv].color }}>
                  <div className="ae-lv-num">L{lv}</div>
                  <div className="ae-lv-name">{LEVELS[lv].label}</div>
                  <div className="ae-lv-desc">{LEVELS[lv].desc}</div>
                  <div className="ae-lv-time">{LEVELS[lv].time}s</div>
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => startGame(startLvl)} style={{ marginTop: 20 }}>Begin Sprint</button>
          </div>
        )}

        {/* ============= PLAYING ============= */}
        {phase === 'playing' && question && (
          <>
            <div className="ae-timer-wrap"><div className={`ae-timer-bar ${pct < 15 ? 'danger' : pct < 35 ? 'warn' : ''} ${isLast10 ? 'pulse' : ''}`} style={{ width: `${pct}%` }} /></div>
            <div className="ae-lvl-badge" style={{ '--ae-c': LEVELS[level]?.color }}>L{level} · {LEVELS[level]?.label}</div>

            <div className="ae-q-wrap" key={question.key}>
              {question.type === 'interference' && <div className="ae-distractor">{question.distractor}</div>}
              <div className="ae-question">{question.type === 'sequence' ? question.text : `${question.text} = ?`}</div>
            </div>

            {feedback === 'wrong' && wrongAns !== null && <div className="ae-correct-reveal">= {wrongAns}</div>}
            {speedMsg && <div className="ae-speed-msg">{speedMsg}</div>}
            {streak >= 5 && !feedback && <div className="ae-streak-msg">🔥 {streak} streak! +{streak >= 5 ? 20 : 15}/answer</div>}

            {question.type === 'comparison' ? (
              <div className="ae-cmp">
                <button className={`ae-cmp-btn ${feedback === 'correct' && question.answer === 0 ? 'ok' : ''} ${feedback === 'wrong' && question.answer === 0 ? 'reveal' : ''}`}
                  onClick={() => handleAnswer(0)} disabled={!!feedback}>
                  <span className="ae-cmp-label">A</span>{question.optA}
                </button>
                <span className="ae-cmp-vs">VS</span>
                <button className={`ae-cmp-btn ${feedback === 'correct' && question.answer === 1 ? 'ok' : ''} ${feedback === 'wrong' && question.answer === 1 ? 'reveal' : ''}`}
                  onClick={() => handleAnswer(1)} disabled={!!feedback}>
                  <span className="ae-cmp-label">B</span>{question.optB}
                </button>
              </div>
            ) : (
              <>
                <div className={`ae-display ${feedback === 'correct' ? 'ok' : ''} ${feedback === 'wrong' ? 'err' : ''}`}>
                  {input || <span className="ae-ph">Type answer...</span>}
                  {!feedback && <span className="ae-cursor" />}
                </div>
                <div className="ae-numpad">
                  {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                    <button key={n} className="ae-key" onClick={() => pressKeyRef.current(String(n))} disabled={!!feedback}>{n}</button>
                  ))}
                  <button className="ae-key ae-fn" onClick={() => pressKeyRef.current('back')} disabled={!!feedback}>⌫</button>
                  <button className="ae-key" onClick={() => pressKeyRef.current('0')} disabled={!!feedback}>0</button>
                  <button className="ae-key ae-fn ae-enter" onClick={() => pressKeyRef.current('enter')} disabled={!!feedback}>↵</button>
                </div>
              </>
            )}
          </>
        )}

        {/* ============= RESULTS ============= */}
        {phase === 'done' && (
          <div className="result-screen ae-results">
            <div className="result-emoji">{fin >= 80 ? '🏆' : fin >= 60 ? '🌟' : '💪'}</div>
            <div className="result-label">Arithmetic Engine — Level {level}</div>
            <div className="result-score">{xp} XP</div>

            <div className="ae-quick">
              <div className="ae-qs"><span>✓ Correct</span><span>{correct}/{total}</span></div>
              <div className="ae-qs"><span>⚡ Avg Speed</span><span>{(avgMs / 1000).toFixed(1)}s</span></div>
              <div className="ae-qs"><span>🔥 Best Streak</span><span>{bestStreak}</span></div>
              <div className="ae-qs"><span>🎯 Accuracy</span><span>{accS}%</span></div>
            </div>

            <div className="ae-breakdown">
              <div className="ae-bk-title">Cognitive Breakdown</div>
              {[['Processing Speed', spdS, 'spd'], ['Accuracy', accS, 'acc'], ['Consistency', conS, 'con'], ['Under Pressure', preS, 'pre']].map(([label, val, cls]) => (
                <div key={cls} className="ae-bk-row">
                  <span className="ae-bk-label">{label}</span>
                  <div className="ae-bk-track"><div className={`ae-bk-fill ${cls}`} style={{ width: `${val}%` }} /></div>
                  <span className="ae-bk-val">{val}</span>
                </div>
              ))}
              <div className="ae-bk-row final">
                <span className="ae-bk-label">Final Score</span>
                <div className="ae-bk-track"><div className="ae-bk-fill fin" style={{ width: `${fin}%` }} /></div>
                <span className="ae-bk-val">{fin}/100</span>
              </div>
            </div>

            <div className="ae-tip">{getTip(spdS, accS, conS, preS)}</div>

            <div className="result-actions">
              <button className="btn-primary" onClick={() => startGame(startLvl)}>Play Again</button>
              <button className="btn-secondary" onClick={() => setPhase('start')}>Change Level</button>
              <Link to="/" className="btn-secondary">Home</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
