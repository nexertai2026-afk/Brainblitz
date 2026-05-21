// Analytics engine - tracks user patterns and adapts difficulty

const STORAGE_KEY = 'brainblitz_analytics'

export function loadAnalytics() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : getDefaultAnalytics()
  } catch { return getDefaultAnalytics() }
}

export function saveAnalytics(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getDefaultAnalytics() {
  return {
    sessions: [],
    achievements: [],
    streakDays: 0,
    lastPlayDate: null,
    totalPlayTime: 0,
    gamesPlayed: 0,
  }
}

// Record a game session
export function recordSession(analytics, session) {
  // session: { game, score, accuracy, reactionTime, duration, difficulty, timestamp }
  const updated = { ...analytics }
  updated.sessions = [...updated.sessions.slice(-99), { ...session, timestamp: Date.now() }]
  updated.gamesPlayed += 1
  updated.totalPlayTime += session.duration || 0

  // Track daily streak
  const today = new Date().toDateString()
  if (updated.lastPlayDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    updated.streakDays = updated.lastPlayDate === yesterday ? updated.streakDays + 1 : 1
    updated.lastPlayDate = today
  }

  // Check achievements
  updated.achievements = checkAchievements(updated)
  saveAnalytics(updated)
  return updated
}

// Adaptive difficulty based on recent performance
export function getAdaptiveDifficulty(analytics, game) {
  const recent = analytics.sessions.filter(s => s.game === game).slice(-5)
  if (recent.length < 3) return 1 // Start easy

  const avgAccuracy = recent.reduce((a, s) => a + (s.accuracy || 0), 0) / recent.length
  const avgScore = recent.reduce((a, s) => a + s.score, 0) / recent.length
  const trend = recent.length >= 2
    ? recent[recent.length - 1].score - recent[recent.length - 2].score
    : 0

  // Score 0-100 representing skill level
  let skill = avgAccuracy * 0.6 + Math.min(avgScore / 3, 40)
  if (trend > 0) skill += 5 // Improving

  if (skill >= 75) return 3 // Hard
  if (skill >= 45) return 2 // Medium
  return 1 // Easy
}

// Get cognitive profile scores (0-100 for each area)
export function getCognitiveProfile(analytics) {
  const profile = {
    memory: 0, speed: 0, logic: 0, focus: 0, language: 0, reflex: 0
  }

  const gameMap = {
    memory: ['memory'], speed: ['math'], logic: ['pattern'],
    focus: ['nback', 'stroop'], language: ['word'], reflex: ['reaction']
  }

  for (const [skill, games] of Object.entries(gameMap)) {
    const sessions = analytics.sessions.filter(s => games.includes(s.game)).slice(-10)
    if (sessions.length === 0) { profile[skill] = 0; continue }
    const avg = sessions.reduce((a, s) => a + s.score, 0) / sessions.length
    // Normalize to 0-100 scale
    profile[skill] = Math.min(100, Math.round(avg * 0.5))
  }

  return profile
}

// Get improvement trend for a game
export function getImprovementTrend(analytics, game) {
  const sessions = analytics.sessions.filter(s => s.game === game)
  if (sessions.length < 2) return { trend: 'new', pct: 0 }

  const recent = sessions.slice(-3)
  const older = sessions.slice(-6, -3)

  if (older.length === 0) return { trend: 'new', pct: 0 }

  const recentAvg = recent.reduce((a, s) => a + s.score, 0) / recent.length
  const olderAvg = older.reduce((a, s) => a + s.score, 0) / older.length

  const pct = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0

  return {
    trend: pct > 5 ? 'up' : pct < -5 ? 'down' : 'stable',
    pct: Math.abs(pct)
  }
}

// Achievement definitions and checker
const ACHIEVEMENT_DEFS = [
  { id: 'first_game', name: 'First Steps', icon: '👶', desc: 'Play your first game', check: a => a.gamesPlayed >= 1 },
  { id: 'ten_games', name: 'Getting Warmed Up', icon: '🔥', desc: 'Play 10 games', check: a => a.gamesPlayed >= 10 },
  { id: 'fifty_games', name: 'Brain Athlete', icon: '🏋️', desc: 'Play 50 games', check: a => a.gamesPlayed >= 50 },
  { id: 'streak_3', name: 'Consistent', icon: '📅', desc: '3-day play streak', check: a => a.streakDays >= 3 },
  { id: 'streak_7', name: 'Dedicated', icon: '⭐', desc: '7-day play streak', check: a => a.streakDays >= 7 },
  { id: 'all_games', name: 'Explorer', icon: '🗺️', desc: 'Play all game types',
    check: a => {
      const types = new Set(a.sessions.map(s => s.game))
      return types.size >= 5
    }
  },
  { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', desc: 'Score 150+ in Math Sprint',
    check: a => a.sessions.some(s => s.game === 'math' && s.score >= 150) },
  { id: 'perfect_memory', name: 'Photographic', icon: '📸', desc: 'Complete Memory in under 15 moves',
    check: a => a.sessions.some(s => s.game === 'memory' && s.accuracy >= 90) },
  { id: 'fast_reflex', name: 'Lightning', icon: '⚡', desc: 'Under 200ms reaction time',
    check: a => a.sessions.some(s => s.game === 'reaction' && s.reactionTime && s.reactionTime < 200) },
  { id: 'pattern_master', name: 'Pattern Master', icon: '🎯', desc: 'Reach level 10 in Pattern',
    check: a => a.sessions.some(s => s.game === 'pattern' && s.score >= 225) },
]

function checkAchievements(analytics) {
  const earned = new Set(analytics.achievements.map(a => a.id))
  const newAchievements = [...analytics.achievements]

  for (const def of ACHIEVEMENT_DEFS) {
    if (!earned.has(def.id) && def.check(analytics)) {
      newAchievements.push({ id: def.id, earnedAt: Date.now() })
    }
  }

  return newAchievements
}

export function getAchievementDefs() { return ACHIEVEMENT_DEFS }
export function getEarnedAchievements(analytics) {
  const earned = new Set(analytics.achievements.map(a => a.id))
  return ACHIEVEMENT_DEFS.map(d => ({ ...d, earned: earned.has(d.id) }))
}
