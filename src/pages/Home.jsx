import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { getAdaptiveDifficulty, getImprovementTrend } from '../utils/analytics'

const modules = [
  { id: 'memory', title: 'Neural Recall', desc: 'Visual memory pattern recognition through sequential card matching', path: '/memory', category: 'Memory', icon: 'grid' },
  { id: 'math', title: 'Arithmetic Engine', desc: 'Rapid numerical computation with progressive streak multipliers', path: '/math', category: 'Speed', icon: 'zap' },
  { id: 'pattern', title: 'Pattern Intelligence', desc: 'Spatial sequence learning and recall under increasing complexity', path: '/pattern', category: 'Logic', icon: 'cpu' },
  { id: 'stroop', title: 'Inhibition Protocol', desc: 'Cognitive interference resistance and selective attention training', path: '/stroop', category: 'Focus', icon: 'eye', tag: 'new' },
  { id: 'nback', title: 'Working Memory Lab', desc: 'N-back paradigm for sustained attention and memory updating', path: '/nback', category: 'Focus', icon: 'layers', tag: 'new' },
  { id: 'reaction', title: 'Reflex Matrix', desc: 'Motor response latency measurement across randomized intervals', path: '/reaction', category: 'Reflex', icon: 'activity' },
  { id: 'word', title: 'Lexical Decoder', desc: 'Linguistic pattern recognition and vocabulary reconstruction', path: '/word', category: 'Language', icon: 'type' },
]

const diffLabels = { 1: 'Baseline', 2: 'Elevated', 3: 'Advanced' }

function ModuleIcon({ type }) {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
    activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>,
    type: <><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></>,
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {icons[type]}
    </svg>
  )
}

export default function Home() {
  const { analytics, totalScore, scores } = useScore()
  const level = Math.floor(totalScore / 100) + 1
  const totalSessions = analytics?.gamesPlayed || 0

  return (
    <div className="fade-in">
      <section className="hero">
        <h1>Train Your Brain</h1>
        <p className="hero-sub">7 adaptive cognitive training modules with real-time performance analytics</p>
        <div className="hero-stats-row">
          <div className="hero-stat"><span className="hero-stat-val">{totalSessions}</span><span className="hero-stat-lbl">Sessions</span></div>
          <div className="hero-stat-divider" />
          <div className="hero-stat"><span className="hero-stat-val">Lv.{level}</span><span className="hero-stat-lbl">Level</span></div>
          <div className="hero-stat-divider" />
          <div className="hero-stat"><span className="hero-stat-val">{totalScore}</span><span className="hero-stat-lbl">Total XP</span></div>
        </div>
        <Link to="/dashboard" className="btn-cta" style={{ marginTop: 28 }}>
          View Brain Profile →
        </Link>
      </section>

      <section className="modules-section">
        <div className="modules-header">
          <h2>Training Modules</h2>
          <span className="modules-count">{modules.length} available</span>
        </div>
        <div className="modules-grid">
          {modules.map(m => {
            const adaptDiff = getAdaptiveDifficulty(analytics, m.id)
            const trend = getImprovementTrend(analytics, m.id)
            const best = scores?.[m.id] || 0
            const sessions = analytics?.sessions?.filter(s => s.game === m.id) || []
            const lastAcc = sessions.length > 0 ? Math.round(sessions[sessions.length - 1].accuracy || 0) : null

            return (
              <Link to={m.path} key={m.id} className="module-card">
                <div className="module-top">
                  <div className="module-icon-wrap">
                    <ModuleIcon type={m.icon} />
                  </div>
                  <div className="module-pills">
                    <span className="module-pill">{m.category}</span>
                    {m.tag && <span className="module-pill accent">{m.tag}</span>}
                  </div>
                </div>

                <div className="module-body">
                  <h3 className="module-title">{m.title}</h3>
                  <p className="module-desc">{m.desc}</p>
                </div>

                <div className="module-meta">
                  <div className="meta-item">
                    <span className="meta-label">Difficulty</span>
                    <span className="meta-value">{diffLabels[adaptDiff]}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Best</span>
                    <span className="meta-value">{best > 0 ? `${best} XP` : '—'}</span>
                  </div>
                  {lastAcc !== null && (
                    <div className="meta-item">
                      <span className="meta-label">Accuracy</span>
                      <span className="meta-value">{lastAcc}%</span>
                    </div>
                  )}
                  {trend.trend === 'up' && (
                    <div className="meta-item">
                      <span className="meta-label">Trend</span>
                      <span className="meta-value trend-pos">+{trend.pct}%</span>
                    </div>
                  )}
                </div>

                <div className="module-footer">
                  <span className="module-btn">Start Session →</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="coming-soon-section">
        <div className="coming-soon-header">
          <h2 className="coming-soon-title">More Modules Coming Soon</h2>
          <p className="coming-soon-sub">New cognitive training protocols are in development — stay tuned for expanded brain training.</p>
        </div>

        <div className="coming-soon-grid">
          {[
            { icon: '🎵', badge: 'AUDITORY', title: 'Auditory Processing', desc: 'Sound pattern recognition and audio working memory' },
            { icon: '🔄', badge: 'EXECUTIVE', title: 'Dual-Task Coordination', desc: 'Simultaneous cognitive load management and task switching' },
            { icon: '🧩', badge: 'SPATIAL', title: 'Spatial Reasoning', desc: '3D mental rotation and spatial working memory' },
          ].map((m, i) => (
            <div className="module-card coming-soon-card" key={i}>
              <div className="coming-soon-lock-overlay">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="coming-soon-tooltip">Coming Soon — Stay Tuned!</div>

              <div className="module-top">
                <div className="module-icon-wrap coming-soon-icon-wrap">
                  <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                </div>
                <div className="module-pills">
                  <span className="module-pill">{m.badge}</span>
                  <span className="module-pill coming-soon-badge">COMING SOON</span>
                </div>
              </div>

              <div className="module-body">
                <h3 className="module-title">{m.title}</h3>
                <p className="module-desc">{m.desc}</p>
              </div>

              <div className="module-meta">
                <div className="meta-item">
                  <span className="meta-label">Difficulty</span>
                  <span className="meta-value">—</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Best</span>
                  <span className="meta-value">—</span>
                </div>
              </div>

              <div className="module-footer">
                <span className="module-btn coming-soon-locked-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: '-1px' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Locked
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="coming-soon-notify">
          <p className="coming-soon-notify-label">Get notified when new modules launch</p>
          <form className="coming-soon-notify-form" onSubmit={(e) => {
            e.preventDefault()
            const input = e.target.querySelector('input')
            const email = input.value.trim()
            if (email) {
              const existing = JSON.parse(localStorage.getItem('brainblitz_notify_emails') || '[]')
              if (!existing.includes(email)) {
                existing.push(email)
                localStorage.setItem('brainblitz_notify_emails', JSON.stringify(existing))
              }
              input.value = ''
              const btn = e.target.querySelector('button')
              btn.textContent = '✓ Subscribed!'
              btn.classList.add('subscribed')
              setTimeout(() => { btn.textContent = 'Notify Me'; btn.classList.remove('subscribed') }, 2500)
            }
          }}>
            <input type="email" placeholder="you@example.com" className="coming-soon-email-input" required />
            <button type="submit" className="coming-soon-notify-btn">Notify Me</button>
          </form>
        </div>
      </section>
    </div>
  )
}
