/**
 * Max score estimates per game for normalization to 0-100 scale.
 */
const MAX_SCORES = {
  'Neural Recall': 200,
  'Arithmetic Engine': 300,
  'Pattern Intelligence': 250,
  'Inhibition Protocol': 400,
  'Working Memory Lab': 200,
  'Reflex Matrix': 290,
  'Lexical Decoder': 375,
}

/**
 * Calculate brain age from all scores.
 * Base age: 25. Better performance = lower brain age.
 */
export function calculateBrainAge(allScores) {
  if (!allScores || allScores.length === 0) return 25

  // Group scores by game and take best per game
  const bestPerGame = {}
  for (const s of allScores) {
    if (!bestPerGame[s.game_name] || s.score > bestPerGame[s.game_name]) {
      bestPerGame[s.game_name] = s.score
    }
  }

  // Normalize each game's best score to 0-100
  const normalized = []
  for (const [game, score] of Object.entries(bestPerGame)) {
    const max = MAX_SCORES[game] || 200
    normalized.push(Math.min(100, (score / max) * 100))
  }

  if (normalized.length === 0) return 25

  const avg = normalized.reduce((a, b) => a + b, 0) / normalized.length

  // Map avg to brain age
  if (avg > 85) return Math.round(18 + (100 - avg) * 0.13) // 18-20
  if (avg > 70) return Math.round(21 + (85 - avg) * 0.27)  // 21-25
  if (avg > 50) return Math.round(26 + (70 - avg) * 0.45)  // 26-35
  if (avg > 30) return Math.round(36 + (50 - avg) * 0.7)   // 36-50
  return Math.round(50 + (30 - avg) * 0.33)                 // 50+
}

/**
 * Calculate user level (1-5) from total games played and average score.
 */
export function calculateLevel(totalGamesPlayed, avgScore) {
  if (totalGamesPlayed > 100 && avgScore > 75) return 5
  if (totalGamesPlayed > 50 && avgScore > 65) return 4
  if (totalGamesPlayed > 25 && avgScore > 55) return 3
  if (totalGamesPlayed > 10 && avgScore > 40) return 2
  return 1
}

/**
 * Get the dominant cognitive domain from best scores.
 */
export function getDominantCognition(bestScores) {
  const domainMap = {
    'Neural Recall': 'Memory',
    'Arithmetic Engine': 'Speed',
    'Pattern Intelligence': 'Reasoning',
    'Inhibition Protocol': 'Focus',
    'Working Memory Lab': 'Attention',
    'Reflex Matrix': 'Reflexes',
    'Lexical Decoder': 'Language',
  }

  if (!bestScores || Object.keys(bestScores).length === 0) return 'Unknown'

  let topGame = null
  let topScore = -1

  for (const [game, score] of Object.entries(bestScores)) {
    if (score > topScore) {
      topScore = score
      topGame = game
    }
  }

  return domainMap[topGame] || 'Unknown'
}
