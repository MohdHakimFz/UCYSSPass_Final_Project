import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, setUnauthorisedHandler, tokenStore, type User } from './api'
import { clearCache } from './offline'
import { useLiveTick } from './useFetch'

type AuthState = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (f: { name: string; email: string; password: string; password_confirmation: string }) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
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
    await clearCache()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    setUser(await api<User>('/auth/me'))
  }, [])

  // Keep the profile fresh (for example, a committee member adds you to the member list). A failed check keeps what is shown.
  const tick = useLiveTick(30_000)
  useEffect(() => {
    if (!user) return
    api<User>('/auth/me')
      .then((fresh) => setUser((prev) => (prev && JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh)))
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  return <AuthContext.Provider value={{ user, loading, signIn, register, signOut, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
