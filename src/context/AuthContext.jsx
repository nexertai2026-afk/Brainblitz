import { createContext, useContext } from 'react'
import { useAuth } from '../hooks/useAuth'

const AuthContext = createContext(null)

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return {
      user: null,
      profile: null,
      loading: true,
      signIn: async () => {},
      signUp: async () => {},
      signOut: async () => {},
      refreshProfile: () => {},
    }
  }
  return ctx
}

export function AuthProvider({ children }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}