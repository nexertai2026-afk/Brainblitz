import { supabase } from './supabase'
import { calculateBrainAge, calculateLevel } from './brainScore'

/**
 * Save a game score to Supabase and recalculate profile stats.
 */
export async function saveScore(userId, gameData) {
  try {
    // Insert score
    const { error } = await supabase.from('game_scores').insert({
      user_id: userId,
      game_name: gameData.game_name,
      score: gameData.score,
      difficulty: gameData.difficulty || 1,
      duration_seconds: gameData.duration_seconds || 0,
    })
    if (error) throw error

    // Update streak
    await updateStreak(userId)

    // Recalculate brain_age and level
    await recalculateProfile(userId)

    return { error: null }
  } catch (error) {
    console.error('Error saving score:', error)
    return { error }
  }
}

/**
 * Get best score per game for a user.
 */
export async function getBestScores(userId) {
  try {
    const { data, error } = await supabase
      .from('game_scores')
      .select('game_name, score')
      .eq('user_id', userId)
      .order('score', { ascending: false })

    if (error) throw error

    // Group by game_name, take max
    const best = {}
    for (const row of data) {
      if (!best[row.game_name] || row.score > best[row.game_name]) {
        best[row.game_name] = row.score
      }
    }
    return { data: best, error: null }
  } catch (error) {
    console.error('Error fetching best scores:', error)
    return { data: {}, error }
  }
}

/**
 * Get recent scores ordered by played_at desc.
 */
export async function getRecentScores(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching recent scores:', error)
    return { data: [], error }
  }
}

/**
 * Get all scores for a specific game.
 */
export async function getGameHistory(userId, gameName) {
  try {
    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('game_name', gameName)
      .order('played_at', { ascending: true })

    if (error) throw error
    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error fetching game history:', error)
    return { data: [], error }
  }
}

/**
 * Update daily streak for a user.
 * - If last_played = yesterday → increment streak
 * - If last_played = today → no change
 * - If last_played > 1 day ago → reset streak to 1
 */
export async function updateStreak(userId) {
  try {
    // Fetch current profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('streak, last_played')
      .eq('id', userId)
      .single()

    if (fetchError) throw fetchError

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const lastPlayed = profile.last_played ? new Date(profile.last_played) : null
    if (lastPlayed) lastPlayed.setHours(0, 0, 0, 0)

    let newStreak = profile.streak || 0

    if (!lastPlayed) {
      // First time playing
      newStreak = 1
    } else {
      const diffDays = Math.floor((today - lastPlayed) / (1000 * 60 * 60 * 24))
      if (diffDays === 0) {
        // Already played today — no change
        return { error: null }
      } else if (diffDays === 1) {
        // Played yesterday — increment
        newStreak += 1
      } else {
        // Gap > 1 day — reset
        newStreak = 1
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ streak: newStreak, last_played: today.toISOString() })
      .eq('id', userId)

    if (updateError) throw updateError
    return { error: null }
  } catch (error) {
    console.error('Error updating streak:', error)
    return { error }
  }
}

/**
 * Recalculate brain_age and level from all scores, then update the profile.
 */
async function recalculateProfile(userId) {
  try {
    // Get all scores
    const { data: allScores, error: scoresError } = await supabase
      .from('game_scores')
      .select('game_name, score')
      .eq('user_id', userId)

    if (scoresError) throw scoresError

    const totalGamesPlayed = allScores.length
    const avgScore = totalGamesPlayed > 0
      ? allScores.reduce((sum, s) => sum + s.score, 0) / totalGamesPlayed
      : 0

    const brainAge = calculateBrainAge(allScores)
    const level = calculateLevel(totalGamesPlayed, avgScore)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ brain_age: brainAge, level })
      .eq('id', userId)

    if (updateError) throw updateError
  } catch (error) {
    console.error('Error recalculating profile:', error)
  }
}

/**
 * Reset ALL data for a user — delete all game_scores and reset profile to defaults.
 */
export async function resetAllData(userId) {
  try {
    // Delete all game scores for this user
    const { error: deleteError } = await supabase
      .from('game_scores')
      .delete()
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    // Reset profile to defaults
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        brain_age: 25,
        level: 1,
        streak: 0,
        last_played: null,
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return { error: null }
  } catch (error) {
    console.error('Error resetting data:', error)
    return { error }
  }
}
