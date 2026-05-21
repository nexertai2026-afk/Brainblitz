import { supabase } from './supabase'

// ─────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(email) {
  const key = `rl_${email}`
  const raw = localStorage.getItem(key)
  const now = Date.now()

  if (!raw) return { blocked: false, attemptsLeft: MAX_ATTEMPTS }

  const data = JSON.parse(raw)

  // Window expired → reset
  if (now - data.firstAttempt > WINDOW_MS) {
    localStorage.removeItem(key)
    return { blocked: false, attemptsLeft: MAX_ATTEMPTS }
  }

  if (data.attempts >= MAX_ATTEMPTS) {
    const msLeft = WINDOW_MS - (now - data.firstAttempt)
    const minutesLeft = Math.ceil(msLeft / 60000)
    return { blocked: true, minutesLeft, attemptsLeft: 0 }
  }

  return { blocked: false, attemptsLeft: MAX_ATTEMPTS - data.attempts }
}

export function recordFailedAttempt(email) {
  const key = `rl_${email}`
  const raw = localStorage.getItem(key)
  const now = Date.now()

  if (!raw) {
    localStorage.setItem(key, JSON.stringify({ attempts: 1, firstAttempt: now }))
    return
  }

  const data = JSON.parse(raw)
  if (now - data.firstAttempt > WINDOW_MS) {
    localStorage.setItem(key, JSON.stringify({ attempts: 1, firstAttempt: now }))
    return
  }

  localStorage.setItem(key, JSON.stringify({ ...data, attempts: data.attempts + 1 }))
}

export function resetRateLimit(email) {
  localStorage.removeItem(`rl_${email}`)
}

// ─────────────────────────────────────────────
// EMAIL EXISTS CHECK
// ─────────────────────────────────────────────
export async function checkEmailExists(email) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (error) return { exists: false, error }
    return { exists: !!data, error: null }
  } catch (error) {
    return { exists: false, error }
  }
}

// ─────────────────────────────────────────────
// OAUTH
// ─────────────────────────────────────────────
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return { data, error }
}

export async function signInWithGithub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin },
  })
  return { data, error }
}

// ─────────────────────────────────────────────
// EMAIL / PASSWORD AUTH
// ─────────────────────────────────────────────
export async function signUp(email, password, username) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        email,
        brain_age: 25,
        level: 1,
        streak: 0,
        last_played: null,
        avatar: '🧠',
        age_group: null,
        goal: null,
      })
      if (profileError) console.error('Profile insert error:', profileError)
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return { user, error: null }
  } catch (error) {
    return { user: null, error }
  }
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => subscription.unsubscribe()
}

export async function getProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw error
    return { profile: data, error: null }
  } catch (error) {
    return { profile: null, error }
  }
}

export async function updateProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return { profile: data, error: null }
  } catch (error) {
    return { profile: null, error }
  }
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { error }
}