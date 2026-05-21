import { createContext, useContext, useState, useEffect } from 'react'
import { loadAnalytics, saveAnalytics, recordSession } from '../utils/analytics'

const defaultScores = { memory: 0, math: 0, pattern: 0, reaction: 0, word: 0, stroop: 0, nback: 0 }
const defaultAnalytics = { sessions: [], achievements: [], streakDays: 0, lastPlayDate: null, totalPlayTime: 0, gamesPlayed: 0 }

const defaultCtx = {
  scores: defaultScores,
  totalScore: 0,
  updateScore: () => {},
  analytics: defaultAnalytics,
  logSession: () => {},
  resetAll: () => {},
}

const ScoreContext = createContext(defaultCtx)

export function useScore() {
  return useContext(ScoreContext) || defaultCtx
}

export function ScoreProvider({ children }) {
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem('brainblitz_scores')
    return saved ? JSON.parse(saved) : { ...defaultScores }
  })

  const [analytics, setAnalytics] = useState(loadAnalytics)

  useEffect(() => {
    localStorage.setItem('brainblitz_scores', JSON.stringify(scores))
  }, [scores])

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)

  const updateScore = (game, newScore) => {
    setScores(prev => ({
      ...prev,
      [game]: Math.max(prev[game] || 0, newScore)
    }))
  }

  const logSession = (session) => {
    const updated = recordSession(analytics, session)
    setAnalytics(updated)
  }

  const resetAll = () => {
    const freshScores = { ...defaultScores }
    const freshAnalytics = { ...defaultAnalytics }
    setScores(freshScores)
    setAnalytics(freshAnalytics)
    localStorage.setItem('brainblitz_scores', JSON.stringify(freshScores))
    saveAnalytics(freshAnalytics)
  }

  return (
    <ScoreContext.Provider value={{ scores, totalScore, updateScore, analytics, logSession, resetAll }}>
      {children}
    </ScoreContext.Provider>
  )
}
