import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, ApiError, tokenStore, type User } from './api'

type AuthState = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = tokenStore.get()
      ? api<User>('/auth/me')
          .then(setUser)
          .catch((e) => {
            // Only a refused token ends the session; a dropped connection should not sign anyone out.
            if (e instanceof ApiError && e.status === 401) tokenStore.clear()
          })
      : Promise.resolve()
    check.finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    tokenStore.set(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined)
    tokenStore.clear()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    setUser(await api<User>('/auth/me'))
  }, [])

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
