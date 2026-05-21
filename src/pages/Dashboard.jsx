import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { getCognitiveProfile, getImprovementTrend, getEarnedAchievements } from '../utils/analytics'
import { getBestScores, getRecentScores, resetAllData } from '../lib/scores'
import { getDominantCognition } from '../lib/brainScore'
import RadarChart from '../components/RadarChart'

export default function Dashboard() {
  const { scores, totalScore, analytics, resetAll } = useScore()
  const { user, profile, refreshProfile } = useAuthContext()
  const localProfile = getCognitiveProfile(analytics)
  const achievements = getEarnedAchievements(analytics)
  const earned = achievements.filter(a => a.earned)

  const [sbBestScores, setSbBestScores] = useState({})
  const [sbRecent, setSbRecent] = useState([])
  const [dominant, setDominant] = useState('—')
  const [loadingDb, setLoadingDb] = useState(false)

  // Reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // Fetch Supabase data when logged in
  useEffect(() => {
    if (!user) return
    setLoadingDb(true)
    Promise.all([
      getBestScores(user.id),
      getRecentScores(user.id, 10),
    ]).then(([bestRes, recentRes]) => {
      if (bestRes.data) {
        setSbBestScores(bestRes.data)
        setDominant(getDominantCognition(bestRes.data))
      }
      if (recentRes.data) setSbRecent(recentRes.data)
    }).finally(() => setLoadingDb(false))
  }, [user])

  const games = ['memory', 'math', 'pattern', 'reaction', 'word', 'stroop', 'nback']
  const gameLabels = { memory: 'Memory', math: 'Math', pattern: 'Pattern', reaction: 'Reaction', word: 'Word', stroop: 'Stroop', nback: 'N-Back' }

  // Use Supabase profile values when logged in, fallback to localStorage
  const brainAge = profile?.brain_age ?? Math.max(10, 25 - Math.floor(totalScore / 80))
  const overallLevel = profile?.level ?? Math.floor(totalScore / 100) + 1
  const streak = profile?.streak ?? analytics.streakDays
  const xpInLevel = totalScore % 100

  const handleReset = async () => {
    setResetting(true)
    try {
      // Reset localStorage
      resetAll()

      // Reset Supabase if logged in
      if (user) {
        await resetAllData(user.id)
        refreshProfile()
      }

      // Clear local dashboard state
      setSbBestScores({})
      setSbRecent([])
      setDominant('—')
      setResetDone(true)
      setShowResetConfirm(false)

      setTimeout(() => setResetDone(false), 3000)
    } catch (err) {
      console.error('Reset failed:', err)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="game-page fade-in">
      <div className="game-header">
        <Link to="/" className="back-btn">← Back</Link>
        <div className="game-stats">
          <div className="stat-box"><div className="label">Streak</div><div className="value">🔥 {streak}d</div></div>
          <div className="stat-box"><div className="label">Games</div><div className="value">{analytics.gamesPlayed}</div></div>
          {user && (
            <div className="stat-box"><div className="label">Domain</div><div className="value">{dominant}</div></div>
          )}
        </div>
      </div>

      {/* Brain Level Card */}
      <div className="dashboard-hero">
        <div className="brain-level-card">
          <div className="brain-level-number">Lv.{overallLevel}</div>
          <div className="brain-level-bar-container">
            <div className="brain-level-bar" style={{ width: `${xpInLevel}%` }} />
          </div>
          <div className="brain-level-text">{xpInLevel}/100 XP to next level</div>
        </div>
        <div className="brain-age-card">
          <div className="brain-age-label">Your Brain Age</div>
          <div className="brain-age-number">{brainAge}</div>
          <div className="brain-age-sub">years</div>
        </div>
      </div>

      {/* Cognitive Profile */}
      <div className="dashboard-section">
        <h3 className="section-title">🧠 Cognitive Profile</h3>
        <div className="radar-container">
          <RadarChart profile={localProfile} size={300} />
        </div>
        <div className="profile-bars">
          {Object.entries(localProfile).map(([key, val]) => {
            const trend = getImprovementTrend(analytics, key === 'speed' ? 'math' : key === 'reflex' ? 'reaction' : key === 'language' ? 'word' : key === 'logic' ? 'pattern' : key === 'focus' ? 'nback' : key)
            return (
              <div key={key} className="profile-bar-row">
                <span className="profile-bar-label">{key}</span>
                <div className="profile-bar-track">
                  <div className="profile-bar-fill" style={{ width: `${val}%` }} />
                </div>
                <span className="profile-bar-value">{val}</span>
                <span className={`trend-badge ${trend.trend}`}>
                  {trend.trend === 'up' ? `↑${trend.pct}%` : trend.trend === 'down' ? `↓${trend.pct}%` : trend.trend === 'new' ? 'NEW' : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Best Scores from Supabase */}
      {user && Object.keys(sbBestScores).length > 0 && (
        <div className="dashboard-section">
          <h3 className="section-title">🏅 Best Scores (Cloud)</h3>
          <div className="session-list">
            {Object.entries(sbBestScores).map(([game, score]) => (
              <div key={game} className="session-item">
                <span className="session-game">{game}</span>
                <span className="session-score">{score} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="dashboard-section">
        <h3 className="section-title">🏆 Achievements ({earned.length}/{achievements.length})</h3>
        <div className="achievements-grid">
          {achievements.map(a => (
            <div key={a.id} className={`achievement-card ${a.earned ? 'earned' : 'locked'}`}>
              <div className="achievement-icon">{a.earned ? a.icon : '🔒'}</div>
              <div className="achievement-name">{a.name}</div>
              <div className="achievement-desc">{a.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <h3 className="section-title">📊 Recent Sessions</h3>
        {user && sbRecent.length > 0 ? (
          <div className="session-list">
            {sbRecent.map((s, i) => (
              <div key={i} className="session-item">
                <span className="session-game">{s.game_name}</span>
                <span className="session-score">{s.score} XP</span>
                <span className="session-acc">{new Date(s.played_at).toLocaleDateString()}</span>
                <span className="session-diff">Lv.{s.difficulty || 1}</span>
              </div>
            ))}
          </div>
        ) : analytics.sessions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Play some games to see your history!</p>
        ) : (
          <div className="session-list">
            {analytics.sessions.slice(-10).reverse().map((s, i) => (
              <div key={i} className="session-item">
                <span className="session-game">{gameLabels[s.game] || s.game}</span>
                <span className="session-score">{s.score} XP</span>
                <span className="session-acc">{s.accuracy ? `${Math.round(s.accuracy)}%` : '—'}</span>
                <span className="session-diff">Lv.{s.difficulty || 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset All Progress */}
      <div className="dashboard-section reset-danger-zone">
        <h3 className="section-title">⚠️ Danger Zone</h3>
        <p className="reset-desc">
          This will permanently erase all your scores, game history, achievements, streaks, and brain age data. You'll start fresh from zero.
        </p>

        {resetDone ? (
          <div className="reset-success-msg">
            ✓ All data has been reset successfully. Start fresh!
          </div>
        ) : !showResetConfirm ? (
          <button
            className="reset-trigger-btn"
            onClick={() => setShowResetConfirm(true)}
          >
            🗑️ Reset All Progress
          </button>
        ) : (
          <div className="reset-confirm-box">
            <p className="reset-confirm-text">
              Are you sure? This action <strong>cannot be undone</strong>.
            </p>
            <div className="reset-confirm-actions">
              <button
                className="reset-confirm-btn"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
              </button>
              <button
                className="reset-cancel-btn"
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
