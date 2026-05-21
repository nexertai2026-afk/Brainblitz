import './AuthModal.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useModal } from '../context/ModalContext'
import { useAuthContext } from '../context/AuthContext'
import {
  signInWithGoogle,
  signInWithGithub,
  checkEmailExists,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  sendPasswordReset,
  updateProfile,
} from '../lib/auth'

// ─── PASSWORD STRENGTH ───────────────────────
function getPasswordStrength(password) {
  if (!password) return { label: '', score: 0, color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const map = [
    { label: 'Weak', color: '#ef4444', pct: 25 },
    { label: 'Fair', color: '#f97316', pct: 50 },
    { label: 'Strong', color: '#eab308', pct: 75 },
    { label: 'Very Strong', color: '#22c55e', pct: 100 },
  ]
  return { ...map[score - 1] || map[0], score }
}

// ─── PROFILE SETUP STEP ──────────────────────
const AVATARS = ['🧠', '⚡', '🎯', '🔮', '💡', '🚀']
const AGE_GROUPS = ['Under 18', '18-25', '26-35', '36-50', '50+']
const GOALS = ['Improve Memory', 'Boost Focus', 'Sharper Thinking', 'Just for Fun']

function ProfileSetupStep({ userId, onComplete, refreshProfile }) {
  const [avatar, setAvatar] = useState('🧠')
  const [ageGroup, setAgeGroup] = useState('')
  const [goal, setGoal] = useState('')
  const [saving, setSaving] = useState(false)

  const handleComplete = async () => {
    setSaving(true)
    await updateProfile(userId, { avatar, age_group: ageGroup || null, goal: goal || null })
    await refreshProfile()
    setSaving(false)
    onComplete()
  }

  return (
    <div className="auth-profile-setup">
      <div className="auth-setup-icon">🧠</div>
      <h3 className="auth-setup-title">Setup Your Profile</h3>
      <p className="auth-setup-sub">Personalise your BrainBlitz experience</p>

      <div className="auth-setup-section">
        <p className="auth-setup-label">Choose your avatar</p>
        <div className="auth-avatar-grid">
          {AVATARS.map(a => (
            <button
              key={a}
              type="button"
              className={`auth-avatar-btn ${avatar === a ? 'selected' : ''}`}
              onClick={() => setAvatar(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="auth-setup-section">
        <p className="auth-setup-label">Age Group</p>
        <div className="auth-chips">
          {AGE_GROUPS.map(ag => (
            <button
              key={ag}
              type="button"
              className={`auth-chip ${ageGroup === ag ? 'selected' : ''}`}
              onClick={() => setAgeGroup(ag)}
            >
              {ag}
            </button>
          ))}
        </div>
      </div>

      <div className="auth-setup-section">
        <p className="auth-setup-label">Your Goal</p>
        <div className="auth-chips vertical">
          {GOALS.map(g => (
            <button
              key={g}
              type="button"
              className={`auth-chip ${goal === g ? 'selected' : ''}`}
              onClick={() => setGoal(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="auth-submit-btn"
        onClick={handleComplete}
        disabled={saving}
      >
        {saving ? <span className="auth-spinner" /> : 'Complete Setup →'}
      </button>
      <button type="button" className="auth-skip-btn" onClick={onComplete}>
        Skip for now
      </button>
    </div>
  )
}

// ─── COUNTDOWN TIMER ─────────────────────────
function useCountdown(minutesLeft) {
  const [seconds, setSeconds] = useState(minutesLeft * 60)

  useEffect(() => {
    setSeconds(minutesLeft * 60)
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [minutesLeft])

  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── SIGN IN TAB ─────────────────────────────
function SignInTab({ onSuccess, switchToSignUp }) {
  const { signIn } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [rateLock, setRateLock] = useState(null) // { blocked, minutesLeft }
  const countdown = useCountdown(rateLock?.minutesLeft || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const rl = checkRateLimit(email)
    if (rl.blocked) { setRateLock(rl); return }
    setRateLock(null)

    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) {
      recordFailedAttempt(email)
      const rl2 = checkRateLimit(email)
      if (rl2.blocked) setRateLock(rl2)
      setError(err.message || 'Sign in failed')
    } else {
      resetRateLimit(email)
      onSuccess()
    }
    setLoading(false)
  }

  const handleForgot = async () => {
    if (!forgotEmail) { setForgotMsg('Enter your email above'); return }
    const { error } = await sendPasswordReset(forgotEmail || email)
    if (error) setForgotMsg('Could not send reset email.')
    else setForgotMsg('Reset link sent! Check your inbox.')
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-oauth-row">
        <button type="button" className="auth-oauth-btn google" onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <button type="button" className="auth-oauth-btn github" onClick={signInWithGithub}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          Continue with GitHub
        </button>
      </div>

      <div className="auth-divider"><span>or continue with email</span></div>

      <div className="auth-field">
        <label className="auth-label">Email</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="auth-input" placeholder="you@example.com" required autoComplete="email"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">Password</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="auth-input" placeholder="••••••••" required minLength={6}
          autoComplete="current-password"
        />
      </div>

      {rateLock?.blocked && (
        <div className="auth-error">
          Too many attempts. Try again in <strong>{countdown}</strong>
        </div>
      )}
      {error && !rateLock?.blocked && <div className="auth-error">{error}</div>}

      <button
        type="submit"
        className="auth-submit-btn"
        disabled={loading || rateLock?.blocked}
      >
        {loading ? <span className="auth-spinner" /> : 'Sign In'}
      </button>

      <button
        type="button"
        className="auth-forgot-link"
        onClick={() => setShowForgot(s => !s)}
      >
        Forgot password?
      </button>

      {showForgot && (
        <div className="auth-forgot-box">
          <input
            type="email"
            className="auth-input"
            placeholder="your@email.com"
            value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
          />
          <button type="button" className="auth-chip selected" onClick={handleForgot}>
            Send Reset Link
          </button>
          {forgotMsg && <p className="auth-forgot-msg">{forgotMsg}</p>}
        </div>
      )}
    </form>
  )
}

// ─── SIGN UP TAB ─────────────────────────────
function SignUpTab({ onSignUpSuccess, switchToSignIn }) {
  const { signUp } = useAuthContext()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null) // null | 'checking' | 'available' | 'taken'
  const debounceRef = useRef(null)

  const strength = getPasswordStrength(password)

  const handleEmailChange = (e) => {
    const val = e.target.value
    setEmail(val)
    setEmailStatus(null)
    clearTimeout(debounceRef.current)
    if (!val || !val.includes('@')) return
    setEmailStatus('checking')
    debounceRef.current = setTimeout(async () => {
      const { exists } = await checkEmailExists(val)
      setEmailStatus(exists ? 'taken' : 'available')
    }, 500)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('Username is required'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (!terms) { setError('Please accept the terms'); return }
    if (emailStatus === 'taken') { setError('This email is already registered'); return }
    if (strength.score < 1) { setError('Password is too weak'); return }

    setLoading(true)
    const { data, error: err } = await signUp(email, password, username.trim())
    if (err) {
      setError(err.message || 'Sign up failed')
    } else {
      onSignUpSuccess(data?.user?.id)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-oauth-row">
        <button type="button" className="auth-oauth-btn google" onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Sign up with Google
        </button>
        <button type="button" className="auth-oauth-btn github" onClick={signInWithGithub}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          Sign up with GitHub
        </button>
      </div>

      <div className="auth-divider"><span>or continue with email</span></div>

      <div className="auth-field">
        <label className="auth-label">Username</label>
        <input
          type="text" value={username} onChange={e => setUsername(e.target.value)}
          className="auth-input" placeholder="BrainTrainer42" required autoComplete="username"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">Email</label>
        <div className="auth-input-wrapper">
          <input
            type="email" value={email} onChange={handleEmailChange}
            className={`auth-input ${emailStatus === 'taken' ? 'input-error' : emailStatus === 'available' ? 'input-success' : ''}`}
            placeholder="you@example.com" required autoComplete="email"
          />
          {emailStatus === 'checking' && <span className="auth-input-icon">⏳</span>}
          {emailStatus === 'available' && <span className="auth-input-icon green">✓</span>}
          {emailStatus === 'taken' && <span className="auth-input-icon red">✗</span>}
        </div>
        {emailStatus === 'taken' && (
          <p className="auth-field-hint red">
            Account already exists.{' '}
            <button type="button" className="auth-inline-link" onClick={switchToSignIn}>
              Sign in instead?
            </button>
          </p>
        )}
      </div>

      <div className="auth-field">
        <label className="auth-label">Password</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          className="auth-input" placeholder="••••••••" required minLength={6}
          autoComplete="new-password"
        />
        {password && (
          <div className="auth-strength">
            <div className="auth-strength-bar">
              <div
                className="auth-strength-fill"
                style={{ width: `${strength.pct}%`, background: strength.color }}
              />
            </div>
            <span className="auth-strength-label" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      <div className="auth-field">
        <label className="auth-label">Confirm Password</label>
        <input
          type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          className={`auth-input ${confirm && confirm !== password ? 'input-error' : ''}`}
          placeholder="••••••••" required autoComplete="new-password"
        />
        {confirm && confirm !== password && (
          <p className="auth-field-hint red">Passwords don't match</p>
        )}
      </div>

      <label className="auth-terms">
        <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
        <span>I agree to the Terms & Privacy Policy</span>
      </label>

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? <span className="auth-spinner" /> : 'Create Account'}
      </button>
    </form>
  )
}

// ─── MAIN MODAL ──────────────────────────────
export default function AuthModal() {
  const { isOpen, closeModal, defaultTab } = useModal()
  const { user, refreshProfile } = useAuthContext()
  const [tab, setTab] = useState(defaultTab)
  const [step, setStep] = useState('auth') // 'auth' | 'profile'
  const [newUserId, setNewUserId] = useState(null)
  const overlayRef = useRef(null)

  // Sync tab with defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab)
      setStep('auth')
    }
  }, [isOpen, defaultTab])

  // ESC key closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closeModal])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) closeModal()
  }

  const handleSignInSuccess = () => closeModal()

  const handleSignUpSuccess = (userId) => {
    setNewUserId(userId)
    setStep('profile')
  }

  const handleProfileComplete = () => {
    refreshProfile()
    closeModal()
  }

  if (!isOpen) return null

  return (
    <div
      className={`auth-overlay ${isOpen ? 'open' : ''}`}
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="auth-modal">
        <button className="auth-close-btn" onClick={closeModal} aria-label="Close">✕</button>

        {step === 'auth' ? (
          <>
            <div className="auth-modal-header">
              <div className="auth-modal-icon">🧠</div>
              <h2 className="auth-modal-title">BrainBlitz</h2>
              <p className="auth-modal-sub">Train your mind. Beat your brain.</p>
            </div>

            <div className="auth-tabs">
              <button
                className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
                onClick={() => setTab('signin')}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                onClick={() => setTab('signup')}
              >
                Sign Up
              </button>
            </div>

            {tab === 'signin' ? (
              <SignInTab
                onSuccess={handleSignInSuccess}
                switchToSignUp={() => setTab('signup')}
              />
            ) : (
              <SignUpTab
                onSignUpSuccess={handleSignUpSuccess}
                switchToSignIn={() => setTab('signin')}
              />
            )}
          </>
        ) : (
          <ProfileSetupStep
            userId={newUserId || user?.id}
            onComplete={handleProfileComplete}
            refreshProfile={refreshProfile}
          />
        )}
      </div>
    </div>
  )
}