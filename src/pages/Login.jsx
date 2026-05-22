// FILE: src/pages/Login.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import {
  signInWithGoogle,
  signInWithGithub,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  sendPasswordReset,
} from '../lib/auth'
import loginBg from '../assets/login-bg.png'
import './Login.css'

// ─── UTILS ───────────────────────────────────────────────────────────────────
function mapError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid') || m.includes('credentials') || m.includes('wrong'))
    return 'Wrong email or password'
  if (m.includes('not confirmed') || m.includes('verify'))
    return 'Please verify your email first'
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Account exists — sign in instead'
  return msg || 'Something went wrong'
}

function useCountdown(minutesLeft) {
  const [seconds, setSeconds] = useState(minutesLeft * 60)
  useEffect(() => {
    setSeconds(minutesLeft * 60)
    const iv = setInterval(() => {
      setSeconds(s => { if (s <= 1) { clearInterval(iv); return 0 } return s - 1 })
    }, 1000)
    return () => clearInterval(iv)
  }, [minutesLeft])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

const HomeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

function Spinner() {
  return <span className="lv2-spinner" aria-hidden="true" />
}

// ─── SHARED ───────────────────────────────────────────────────────────────────
function OAuthButtons({ label }) {
  return (
    <div className="lv2-oauth">
      <button type="button" className="lv2-oauth-btn" onClick={signInWithGoogle}>
        <GoogleIcon />
        <span>{label} with Google</span>
      </button>
      <button type="button" className="lv2-oauth-btn" onClick={signInWithGithub}>
        <GithubIcon />
        <span>{label} with GitHub</span>
      </button>
    </div>
  )
}

function Divider() {
  return (
    <div className="lv2-divider">
      <span className="lv2-div-line" />
      <span className="lv2-div-text">or</span>
      <span className="lv2-div-line" />
    </div>
  )
}

// ─── SIGN IN FORM ─────────────────────────────────────────────────────────────
function SignInForm({ onSuccess }) {
  const { signIn } = useAuthContext()
  const [email,       setEmail]      = useState('')
  const [password,    setPassword]   = useState('')
  const [error,       setError]      = useState('')
  const [loading,     setLoading]    = useState(false)
  const [showForgot,  setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail]= useState('')
  const [forgotMsg,   setForgotMsg]  = useState('')
  const [rateLock,    setRateLock]   = useState(null)
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
      setError(mapError(err.message))
    } else {
      resetRateLimit(email)
      onSuccess()
    }
    setLoading(false)
  }

  const handleForgot = async () => {
    const target = forgotEmail || email
    if (!target) { setForgotMsg('Enter your email above'); return }
    const { error } = await sendPasswordReset(target)
    setForgotMsg(error ? 'Could not send reset email.' : 'Check your inbox ✓')
  }

  return (
    <>
      <h1 className="lv2-heading">Welcome back</h1>
      <p className="lv2-sub">Sign in to continue your training</p>

      <OAuthButtons label="Sign in" />

      <Divider />

      <form onSubmit={handleSubmit} className="lv2-form" noValidate>
        <input
          type="email"
          className="lv2-input"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <input
          type="password"
          className="lv2-input"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="current-password"
        />

        <button
          type="button"
          className="lv2-forgot-link"
          onClick={() => setShowForgot(s => !s)}
        >
          Forgot password?
        </button>

        {showForgot && (
          <div className="lv2-forgot-box">
            <input
              type="email"
              className="lv2-input"
              placeholder="your@email.com"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
            />
            <button type="button" className="lv2-reset-btn" onClick={handleForgot}>
              Send Reset Link
            </button>
            {forgotMsg && <p className="lv2-forgot-msg">{forgotMsg}</p>}
          </div>
        )}

        {rateLock?.blocked && (
          <div className="lv2-error">
            Too many attempts. Try again in <strong>{countdown}</strong>
          </div>
        )}
        {error && !rateLock?.blocked && (
          <div className="lv2-error">{error}</div>
        )}

        <button
          type="submit"
          className="lv2-submit"
          disabled={loading || rateLock?.blocked}
        >
          {loading ? <Spinner /> : 'Continue'}
        </button>
      </form>

      <p className="lv2-toggle">
        Don't have an account?{' '}
        <Link to="/signup" className="lv2-toggle-link">Create one</Link>
      </p>

      <div className="lv2-home-row">
        <Link to="/" className="lv2-home-link">
          <HomeIcon />
          <span>Back to home</span>
        </Link>
      </div>
    </>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Login() {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleSignInSuccess = () => navigate('/')

  return (
    <div className={`lv2-page${visible ? ' lv2-page--in' : ''}`}>
      <div className="lv2-card">

        {/* LEFT — image panel */}
        <div className="lv2-img-side" aria-hidden="true">
          <img src={loginBg} alt="" className="lv2-bg-img" />
        </div>

        {/* RIGHT — form */}
        <div className="lv2-form-side">
          <SignInForm onSuccess={handleSignInSuccess} />
        </div>

      </div>
    </div>
  )
}