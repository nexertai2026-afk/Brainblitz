import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useScore } from '../context/ScoreContext'
import { useAuthContext } from '../context/AuthContext'
import { getBestScores, getRecentScores, getGameHistory } from '../lib/scores'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const gameNames = {
  memory: { name: 'Memory Match', icon: '🧠', path: '/memory' },
  math: { name: 'Math Sprint', icon: '⚡', path: '/math' },
  pattern: { name: 'Pattern Recall', icon: '🎯', path: '/pattern' },
  reaction: { name: 'Reaction Test', icon: '🔥', path: '/reaction' },
  word: { name: 'Word Scramble', icon: '📝', path: '/word' },
  stroop: { name: 'Stroop Test', icon: '🌈', path: '/stroop' },
  nback: { name: 'N-Back Test', icon: '🧪', path: '/nback' },
}

const supabaseGameMap = {
  'Neural Recall': { key: 'memory', icon: '🧠', path: '/memory' },
  'Arithmetic Engine': { key: 'math', icon: '⚡', path: '/math' },
  'Pattern Intelligence': { key: 'pattern', icon: '🎯', path: '/pattern' },
  'Reflex Matrix': { key: 'reaction', icon: '🔥', path: '/reaction' },
  'Lexical Decoder': { key: 'word', icon: '📝', path: '/word' },
  'Inhibition Protocol': { key: 'stroop', icon: '🌈', path: '/stroop' },
  'Working Memory Lab': { key: 'nback', icon: '🧪', path: '/nback' },
}

const rankBadges = ['#C9B37C', '#A8A8A8', '#8B7355']

export default function Scores() {
  const { scores, totalScore, analytics } = useScore()
  const { user } = useAuthContext()

  const [sbBest, setSbBest] = useState({})
  const [sbRecent, setSbRecent] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loadingChart, setLoadingChart] = useState(false)
  const [loadingDb, setLoadingDb] = useState(false)

  // Fetch Supabase data when logged in
  useEffect(() => {
    if (!user) return
    setLoadingDb(true)
    Promise.all([
      getBestScores(user.id),
      getRecentScores(user.id, 10),
    ]).then(([bestRes, recentRes]) => {
      if (bestRes.data) setSbBest(bestRes.data)
      if (recentRes.data) setSbRecent(recentRes.data)
    }).finally(() => setLoadingDb(false))
  }, [user])

  // Fetch chart data when game selected
  useEffect(() => {
    if (!selectedGame || !user) return
    setLoadingChart(true)
    getGameHistory(user.id, selectedGame).then(({ data }) => {
      if (data) {
        setChartData(data.map((s, i) => ({
          session: i + 1,
          score: s.score,
          date: new Date(s.played_at).toLocaleDateString(),
        })))
      }
    }).finally(() => setLoadingChart(false))
  }, [selectedGame, user])

  // Build sorted list — prefer Supabase data when available
  const sorted = user && Object.keys(sbBest).length > 0
    ? Object.entries(sbBest).sort((a, b) => b[1] - a[1])
    : Object.entries(scores).filter(([k]) => gameNames[k]).sort((a, b) => b[1] - a[1])

  const isSupabaseData = user && Object.keys(sbBest).length > 0

  const gamesPlayed = analytics?.gamesPlayed || 0
  const bestGame = sorted.length > 0 && sorted[0][1] > 0
    ? (isSupabaseData ? sorted[0][0] : gameNames[sorted[0][0]]?.name)
    : null
  const avgScore = sorted.length > 0
    ? Math.round(sorted.reduce((a, [, v]) => a + v, 0) / sorted.filter(([, v]) => v > 0).length) || 0
    : 0

  return (
    <div className="scores-page fade-in">
      <Link to="/" className="back-btn" style={{ marginBottom: 20 }}>← Back</Link>

      {/* Hero Score Card */}
      <div className="scores-hero-card">
        <div className="scores-trophy">🏆</div>
        <p className="scores-hero-label">Your Best Score</p>
        <div className="scores-hero-number">{totalScore.toLocaleString()}</div>
        <div className="scores-hero-unit">XP</div>
      </div>

      {/* Mini Insights */}
      <div className="scores-insights">
        <div className="scores-insight-tile">
          <div className="insight-value">{gamesPlayed}</div>
          <div className="insight-label">Games Played</div>
        </div>
        <div className="scores-insight-tile">
          <div className="insight-value">{avgScore}</div>
          <div className="insight-label">Avg. Score</div>
        </div>
        <div className="scores-insight-tile">
          <div className="insight-value">{bestGame ? (typeof bestGame === 'string' ? bestGame.split(' ')[0] : '—') : '—'}</div>
          <div className="insight-label">Top Game</div>
        </div>
      </div>

      {/* Recent Sessions from Supabase */}
      {user && sbRecent.length > 0 && (
        <div className="scores-list-section">
          <h3 className="scores-list-title">Recent Sessions</h3>
          <div className="scores-tile-list">
            {sbRecent.map((s, i) => {
              const mapped = supabaseGameMap[s.game_name]
              return (
                <div
                  key={i}
                  className="scores-tile"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedGame(s.game_name)}
                >
                  <div className="scores-tile-icon">{mapped?.icon || '🎮'}</div>
                  <div className="scores-tile-name">{s.game_name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginRight: 8 }}>
                    {new Date(s.played_at).toLocaleDateString()}
                  </div>
                  <div className="scores-tile-xp">
                    <span className="scores-xp-value">{s.score}</span>
                    <span className="scores-xp-label">XP</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Score Trend Chart */}
      {user && selectedGame && (
        <div className="scores-list-section" style={{ marginTop: 8 }}>
          <h3 className="scores-list-title">📈 {selectedGame} — Score Trend</h3>
          {loadingChart ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>Loading...</p>
          ) : chartData.length > 1 ? (
            <div style={{ width: '100%', height: 220, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="session" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(18,18,22,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: '0.82rem' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                    itemStyle={{ color: '#a78bfa' }}
                    formatter={(value) => [`${value} XP`, 'Score']}
                    labelFormatter={(label) => `Session ${label}`}
                  />
                  <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} activeDot={{ r: 5, fill: '#a78bfa' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20, fontSize: '0.85rem' }}>
              Play at least 2 sessions to see the trend chart.
            </p>
          )}
          <button
            className="btn-secondary"
            style={{ marginTop: 12, fontSize: '0.78rem', padding: '8px 16px' }}
            onClick={() => { setSelectedGame(null); setChartData([]) }}
          >
            Close Chart
          </button>
        </div>
      )}

      {/* Ranking Tiles */}
      <div className="scores-list-section">
        <h3 className="scores-list-title">{isSupabaseData ? 'Best Scores (Cloud)' : 'Game Rankings'}</h3>
        <div className="scores-tile-list">
          {sorted.map(([key, val], i) => {
            const isCloud = isSupabaseData
            const mapped = isCloud ? supabaseGameMap[key] : null
            const g = isCloud ? { name: key, icon: mapped?.icon || '🎮', path: mapped?.path || '/' } : gameNames[key]
            if (!g) return null
            return (
              <div
                key={key}
                className="scores-tile"
                style={{ cursor: isCloud ? 'pointer' : undefined }}
                onClick={() => isCloud && setSelectedGame(key)}
              >
                <div className="scores-tile-rank" style={{
                  color: i < 3 ? rankBadges[i] : 'var(--text-secondary)',
                  fontWeight: i < 3 ? 800 : 600
                }}>
                  {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`}
                </div>
                <div className="scores-tile-icon">{g.icon}</div>
                <div className="scores-tile-name">{g.name}</div>
                <div className="scores-tile-xp">
                  <span className="scores-xp-value">{val}</span>
                  <span className="scores-xp-label">XP</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {totalScore === 0 && !user && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 24, fontSize: '0.95rem' }}>
          Play some games to see your scores here.
        </p>
      )}

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <Link to="/dashboard" className="scores-cta-btn">
          View Brain Profile →
        </Link>
      </div>
    </div>
  )
}
