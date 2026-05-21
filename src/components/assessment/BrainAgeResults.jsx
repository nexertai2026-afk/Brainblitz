import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts'

function useCountUp(target, duration = 2000, delay = 500) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = Date.now()
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])
  return value
}

// Particle system for the results screen
function Particles() {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
      opacity: Math.random() * 0.5 + 0.1,
    }))
  }, [])

  return (
    <div className="particles-container">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function BrainAgeCard({ brainAge, scores, dominantStrength, cardRef }) {
  const radarData = Object.entries(scores).map(([key, val]) => ({
    domain: key,
    score: val,
    fullMark: 100,
  }))

  const domainIcons = {
    Memory: '🧠',
    Speed: '⚡',
    Reasoning: '🔷',
    Reflexes: '🎯',
    Language: '🔤',
  }

  return (
    <div className="brain-card-wrapper" ref={cardRef}>
      <div className="brain-card">
        {/* Background gradient decoration */}
        <div className="brain-card-bg-orb orb-1" />
        <div className="brain-card-bg-orb orb-2" />
        <div className="brain-card-bg-orb orb-3" />

        {/* Header */}
        <div className="brain-card-header">
          <div className="brain-card-logo">
            <span className="brain-card-logo-icon">⚡</span>
            <span className="brain-card-logo-text">BrainBlitz</span>
          </div>
          <span className="brain-card-badge">Cognitive Assessment</span>
        </div>

        {/* Brain Age */}
        <div className="brain-card-age-section">
          <span className="brain-card-age-label">Brain Age</span>
          <div className="brain-card-age-number">{brainAge}</div>
          <div className="brain-card-age-unit">years</div>
        </div>

        {/* Dominant Strength */}
        <div className="brain-card-strength">
          <span className="brain-card-strength-icon">{domainIcons[dominantStrength] || '🧠'}</span>
          <div>
            <span className="brain-card-strength-label">Dominant Strength</span>
            <span className="brain-card-strength-value">{dominantStrength}</span>
          </div>
        </div>

        {/* Mini Radar Chart */}
        <div className="brain-card-radar">
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid
                gridType="polygon"
                stroke="rgba(255,255,255,0.08)"
              />
              <PolarAngleAxis
                dataKey="domain"
                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'Outfit' }}
              />
              <PolarRadiusAxis
                tick={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Radar
                dataKey="score"
                stroke="#7c3aed"
                fill="url(#radarGradient)"
                fillOpacity={0.4}
                strokeWidth={2}
                dot={{ r: 3, fill: '#a78bfa', stroke: '#7c3aed', strokeWidth: 1 }}
              />
              <defs>
                <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Domain Scores Bar */}
        <div className="brain-card-scores-row">
          {Object.entries(scores).map(([domain, score]) => (
            <div key={domain} className="brain-card-score-item">
              <span className="bcs-label">{domain}</span>
              <div className="bcs-bar">
                <div className="bcs-fill" style={{ width: `${score}%` }} />
              </div>
              <span className="bcs-value">{score}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="brain-card-footer">
          <span>I trained my brain at BrainBlitz</span>
          <span className="brain-card-url">brainblitz.app</span>
        </div>
      </div>
    </div>
  )
}

export default function BrainAgeResults({ scores, onContinue }) {
  const cardRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  // Calculate Brain Age
  const compositeScore = useMemo(() => {
    const vals = Object.values(scores)
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }, [scores])

  const brainAge = useMemo(() => {
    // Base 25, adjust ±15 based on composite score (0-100)
    // Score 100 → age 10, Score 50 → age 25, Score 0 → age 40
    return Math.round(25 - ((compositeScore - 50) / 50) * 15)
  }, [compositeScore])

  const dominantStrength = useMemo(() => {
    let max = 0, dom = 'Memory'
    Object.entries(scores).forEach(([k, v]) => {
      if (v > max) { max = v; dom = k }
    })
    return dom
  }, [scores])

  const animatedAge = useCountUp(brainAge, 2200, 800)

  const handleDownload = async () => {
    if (downloading || !cardRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = 'my-brain-age-brainblitz.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const getAgeEmoji = () => {
    if (brainAge <= 15) return '🧒'
    if (brainAge <= 20) return '🧑'
    if (brainAge <= 25) return '🧠'
    if (brainAge <= 30) return '💪'
    return '🔥'
  }

  const getAgeMessage = () => {
    if (brainAge <= 15) return "Exceptional! Your brain is razor-sharp!"
    if (brainAge <= 20) return "Outstanding cognitive performance!"
    if (brainAge <= 25) return "Your brain is in peak condition!"
    if (brainAge <= 30) return "Good results — room to train!"
    return "Let's sharpen those neural pathways!"
  }

  return (
    <div className="brain-results-page">
      <Particles />

      {/* Reveal Animation */}
      <motion.div
        className="brain-reveal-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <motion.div
          className="brain-reveal-pulse"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="brain-reveal-emoji">{getAgeEmoji()}</span>
        <h2 className="brain-reveal-title">Your Brain Age</h2>
        <div className="brain-reveal-age">{animatedAge}</div>
        <p className="brain-reveal-message">{getAgeMessage()}</p>

        <motion.div
          className="brain-dominant-badge"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.5, duration: 0.5 }}
        >
          <span>Top Strength: <strong>{dominantStrength}</strong></span>
        </motion.div>
      </motion.div>

      {/* Score Breakdown */}
      <motion.div
        className="brain-breakdown"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        <h3 className="brain-breakdown-title">Cognitive Profile</h3>
        <div className="brain-breakdown-grid">
          {Object.entries(scores).map(([domain, score], i) => (
            <motion.div
              key={domain}
              className="brain-domain-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.8 + i * 0.15 }}
            >
              <div className="domain-info">
                <span className="domain-name">{domain}</span>
                <span className="domain-score">{score}</span>
              </div>
              <div className="domain-bar">
                <motion.div
                  className="domain-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ delay: 2 + i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    background: [
                      'linear-gradient(90deg, #7c3aed, #a78bfa)',
                      'linear-gradient(90deg, #06b6d4, #67e8f9)',
                      'linear-gradient(90deg, #f43f5e, #fb7185)',
                      'linear-gradient(90deg, #10b981, #34d399)',
                      'linear-gradient(90deg, #f59e0b, #fbbf24)',
                    ][i]
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Shareable Card */}
      <motion.div
        className="brain-card-section"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.8, duration: 0.6 }}
      >
        <h3 className="brain-card-section-title">Your Shareable Card</h3>
        <p className="brain-card-section-desc">Download and share your results on social media!</p>

        <BrainAgeCard
          brainAge={brainAge}
          scores={scores}
          dominantStrength={dominantStrength}
          cardRef={cardRef}
        />

        <div className="brain-card-actions">
          <button className="btn-share" onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <span>⏳ Generating...</span>
            ) : (
              <span>📥 Download Card as PNG</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="brain-cta-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.2, duration: 0.5 }}
      >
        <button className="btn-primary brain-start-training" onClick={onContinue}>
          🚀 Start Training
        </button>
      </motion.div>
    </div>
  )
}
