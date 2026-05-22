import { supabase } from './supabase'

const FUNCTIONS_URL = `https://fisjgwzlpwdqsnuqqetp.supabase.co/functions/v1`

// Welcome email — signup ke baad call karo
export const sendWelcomeEmail = async (email, username) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${FUNCTIONS_URL}/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ email, username })
    })
  } catch (err) {
    console.error('Welcome email error:', err)
  }
}

// Forgot password email
export const sendForgotPasswordEmail = async (email, resetLink) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${FUNCTIONS_URL}/send-forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ email, resetLink })
    })
  } catch (err) {
    console.error('Forgot password email error:', err)
  }
}

// Achievement email — game end par call karo
export const sendAchievementEmail = async (email, username, achievement, score, game) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${FUNCTIONS_URL}/send-achievement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ email, username, achievement, score, game })
    })
  } catch (err) {
    console.error('Achievement email error:', err)
  }
}

// Weekly report email
export const sendWeeklyReport = async (email, userData) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${FUNCTIONS_URL}/send-weekly-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ email, ...userData })
    })
  } catch (err) {
    console.error('Weekly report email error:', err)
  }
}