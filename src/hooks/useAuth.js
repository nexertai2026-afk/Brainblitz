import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/auth'
import { sendWelcomeEmail } from '../lib/emails'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { profile: p } = await getProfile(userId)
    setProfile(p)
  }, [])

  const ensureProfile = useCallback(async (u) => {
    if (!u) return
    try {
      const { profile: existing } = await getProfile(u.id)
      if (existing) {
        setProfile(existing)
        return
      }

      // Profile nahi mila — OAuth user ke liye auto-create karo
      const fullName = u.user_metadata?.full_name || u.user_metadata?.name || ''
      const emailPrefix = u.email?.split('@')[0] || 'Player'
      const username = fullName.trim() || emailPrefix

      const { error } = await supabase.from('profiles').insert({
        id: u.id,
        username,
        email: u.email,
        brain_age: 25,
        level: 1,
        streak: 0,
        last_played: null,
        avatar: '🧠',
        age_group: null,
        goal: null,
      })

      if (error) {
        console.error('Profile create error:', error)
      } else {
        await fetchProfile(u.id)
      }
    } catch (err) {
      console.error('ensureProfile error:', err)
    }
  }, [fetchProfile])

  useEffect(() => {
    // Initial session — OAuth redirect bhi yahan handle hota hai
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) ensureProfile(u)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null
        setUser(u)

        if (u) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // OAuth + normal login dono handle hote hain
            await ensureProfile(u)
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
  }, [fetchProfile, ensureProfile])

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

      // Welcome email bhejo ✅
      await sendWelcomeEmail(email, username)
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