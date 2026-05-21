import { useState, useEffect, useRef, useCallback } from 'react'
import { loadBrainEngine } from '../lib/wasmLoader'

export function useBrainEngine() {
  const [wasmReady, setWasmReady] = useState(false)
  const [wasmError, setWasmError] = useState(null)
  const engineRef = useRef(null)  // C++ BrainEngine instance
  const moduleRef = useRef(null)  // Emscripten module

  // WASM load karo on mount
  useEffect(() => {
    let cancelled = false

    loadBrainEngine()
      .then((Module) => {
        if (cancelled) return
        moduleRef.current = Module
        // C++ BrainEngine object banao
        engineRef.current = new Module.BrainEngine()
        setWasmReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('WASM load failed:', err)
        setWasmError(err.message)
        // Fallback: JS-based analysis use karenge
        setWasmReady(false)
      })

    return () => { cancelled = true }
  }, [])

  // ─── RECORD EVENTS ─────────────────────────

  const recordReactionClick = useCallback((timestamp, isCorrect, colorShown = 0) => {
    if (!engineRef.current) return
    try {
      engineRef.current.recordReactionClick(timestamp, isCorrect, colorShown)
    } catch (e) {
      console.warn('recordReactionClick error:', e)
    }
  }, [])

  const recordMemoryFlip = useCallback((cardId, timestamp) => {
    if (!engineRef.current) return
    try {
      engineRef.current.recordMemoryFlip(cardId, timestamp)
    } catch (e) {
      console.warn('recordMemoryFlip error:', e)
    }
  }, [])

  const recordMemoryAttempt = useCallback((card1, card2, success, time) => {
    if (!engineRef.current) return
    try {
      engineRef.current.recordMemoryAttempt(card1, card2, success, time)
    } catch (e) {
      console.warn('recordMemoryAttempt error:', e)
    }
  }, [])

  const recordPattern = useCallback((patternId, solveTime, correct) => {
    if (!engineRef.current) return
    try {
      engineRef.current.recordPattern(patternId, solveTime, correct)
    } catch (e) {
      console.warn('recordPattern error:', e)
    }
  }, [])

  // ─── ANALYSIS ──────────────────────────────

  const getBrainAnalysis = useCallback(() => {
    if (!engineRef.current) return getDefaultAnalysis()
    try {
      const jsonStr = engineRef.current.getBrainAnalysis()
      return JSON.parse(jsonStr)
    } catch (e) {
      console.warn('getBrainAnalysis error:', e)
      return getDefaultAnalysis()
    }
  }, [])

  const getAdaptiveDifficulty = useCallback((recentAccuracy = 0.6, recentSpeed = 1.0) => {
    if (!engineRef.current) return getDefaultDifficulty()
    try {
      const jsonStr = engineRef.current.getAdaptiveDifficulty(recentAccuracy, recentSpeed)
      return JSON.parse(jsonStr)
    } catch (e) {
      console.warn('getAdaptiveDifficulty error:', e)
      return getDefaultDifficulty()
    }
  }, [])

  const getFinalScore = useCallback((rawScore, streak = 0, difficulty = 0.5, isPerfect = false) => {
    if (!engineRef.current) return rawScore
    try {
      return engineRef.current.getFinalScore(rawScore, streak, difficulty, isPerfect)
    } catch (e) {
      return rawScore
    }
  }, [])

  const getXP = useCallback((score, streak = 0, difficulty = 0.5, isPerfect = false) => {
    if (!engineRef.current) return Math.floor(score)
    try {
      return engineRef.current.getXP(score, streak, difficulty, isPerfect)
    } catch (e) {
      return Math.floor(score)
    }
  }, [])

  const incrementGamesPlayed = useCallback(() => {
    if (!engineRef.current) return
    try {
      engineRef.current.incrementGamesPlayed()
    } catch (e) {}
  }, [])

  const resetSession = useCallback(() => {
    if (!engineRef.current) return
    try {
      engineRef.current.resetSession()
    } catch (e) {}
  }, [])

  return {
    wasmReady,
    wasmError,
    // Record functions
    recordReactionClick,
    recordMemoryFlip,
    recordMemoryAttempt,
    recordPattern,
    // Analysis functions
    getBrainAnalysis,
    getAdaptiveDifficulty,
    getFinalScore,
    getXP,
    incrementGamesPlayed,
    resetSession,
  }
}

// ─── FALLBACK VALUES ────────────────────────

function getDefaultAnalysis() {
  return {
    mentalAge: 25,
    mentalAgeConfidence: 0.1,
    cognitivePersonality: 'Balanced Thinker',
    performanceClass: 'Average',
    reactionTime: 300,
    reactionType: 'Optimal',
    memoryAccuracy: 0.5,
    memoryCapacity: 6,
    memoryStrategy: 'Visual Memory',
    thinkingStyle: 'Balanced Thinker',
    focusLevel: 0.5,
    fatigueIndex: 0.2,
    consistency: 0.5,
    processingSpeed: 50,
    percentile: 50,
    userType: 2,
    gamesPlayed: 0,
  }
}

function getDefaultDifficulty() {
  return {
    gridSize: 4,
    timeLimit: 60,
    nBackLevel: 1,
    stimulusSpeed: 1500,
    patternComplexity: 2,
    userType: 1,
  }
}