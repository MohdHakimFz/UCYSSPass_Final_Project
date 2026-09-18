import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, setUnauthorisedHandler, tokenStore, type User } from './api'

type AuthState = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (f: { name: string; email: string; password: string; password_confirmation: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUnauthorisedHandler(() => setUser(null))
    tokenStore
      .load()
      .then((t) => (t ? api<User>('/auth/me').then(setUser) : undefined))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<{ user: User; token: string }>('/auth/login', { method: 'POST', body: { email, password } })
    await tokenStore.set(res.token)
    setUser(res.user)
  }, [])

  const register = useCallback(async (f: { name: string; email: string; password: string; password_confirmation: string }) => {
    const res = await api<{ user: User; token: string }>('/auth/register', { method: 'POST', body: f })
    await tokenStore.set(res.token)
    setUser(res.user)
  }, [])

  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined)
    await tokenStore.clear()
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, signIn, register, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
