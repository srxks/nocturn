import { createContext } from 'react'

export const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
})
