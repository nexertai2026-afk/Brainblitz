import { useState } from 'react'
import { motion } from 'framer-motion'

export default function SignUpGate({ scores, onComplete }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    // Save to localStorage
    const userData = {
      name,
      email,
      scores,
      brainAge: calculateBrainAge(scores),
      assessedAt: new Date().toISOString(),
    }
    localStorage.setItem('brainblitz_user', JSON.stringify(userData))
    localStorage.setItem('brainblitz_assessment', JSON.stringify(scores))
    setSaved(true)
    setTimeout(() => onComplete(), 1500)
  }

  const handleGuest = () => {
    localStorage.setItem('brainblitz_assessment', JSON.stringify(scores))
    localStorage.setItem('brainblitz_user', JSON.stringify({
      name: 'Guest',
      scores,
      brainAge: calculateBrainAge(scores),
      assessedAt: new Date().toISOString(),
      isGuest: true,
    }))
    onComplete()
  }

  const calculateBrainAge = (s) => {
    const avg = Object.values(s).reduce((a, b) => a + b, 0) / Object.values(s).length
    return Math.round(25 - ((avg - 50) / 50) * 15)
  }

  if (saved) {
    return (
      <div className="signup-page">
        <motion.div
          className="signup-success"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span className="signup-success-icon">✅</span>
          <h2>You're all set!</h2>
          <p>Your Brain Age has been saved. Let's start training!</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="signup-page">
      <motion.div
        className="signup-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="signup-header">
          <span className="signup-icon">🔐</span>
          <h2 className="signup-title">Save Your Brain Age</h2>
          <p className="signup-subtitle">Track your progress and watch your brain improve over time</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-field">
            <label className="signup-label">Name</label>
            <input
              type="text"
              className="signup-input"
              placeholder="Enter your name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="signup-field">
            <label className="signup-label">Email</label>
            <input
              type="email"
              className="signup-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary signup-submit">
            Save & Start Training
          </button>
        </form>

        <div className="signup-divider">
          <span>or</span>
        </div>

        <button className="btn-secondary signup-guest" onClick={handleGuest}>
          Continue as Guest
        </button>

        <p className="signup-privacy">
          🔒 Your data stays on your device. No spam, ever.
        </p>
      </motion.div>
    </div>
  )
}
