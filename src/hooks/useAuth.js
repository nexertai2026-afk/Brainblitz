import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/auth'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { profile: p } = await getProfile(userId)
    setProfile(p)
  }, [])

  // Auto-create profile for OAuth users who don't have one yet
  const ensureOAuthProfile = useCallback(async (user) => {
    if (!user) return

    const { profile: existing } = await getProfile(user.id)
    if (existing) {
      setProfile(existing)
      return
    }

    // Build username from metadata or email
    const fullName = user.user_metadata?.full_name || ''
    const emailPrefix = user.email?.split('@')[0] || 'user'
    const username = fullName.trim() || emailPrefix

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      username,
      email: user.email,
      brain_age: 25,
      level: 1,
      streak: 0,
      last_played: null,
      avatar: '🧠',
      age_group: null,
      goal: null,
    })

    if (error) {
      console.error('OAuth profile create error:', error)
    } else {
      await fetchProfile(user.id)
    }
  }, [fetchProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null
        setUser(u)

        if (u) {
          if (event === 'SIGNED_IN') {
            // Could be OAuth redirect — ensure profile exists
            await ensureOAuthProfile(u)
          } else {
            await fetchProfile(u.id)
          }
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, ensureOAuthProfile])

  const handleSignIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    return { data, error: null }
  }

  const handleSignUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error }

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
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) return { error }
    setUser(null)
    setProfile(null)
    return { error: null }
  }

  const refreshProfile = () => {
    if (user) fetchProfile(user.id)
  }

  return {
    user,
    profile,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    refreshProfile,
  }
}