import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, errorText, tokenStore, type User } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { landingFor } from '@/lib/roles'
import { Notice } from '@/customer/ui'

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [f, setF] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate(landingFor(user, next), { replace: true })
  }, [loading, user, navigate, next])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') {
        const signedIn = await signIn(f.email, f.password)
        navigate(landingFor(signedIn, next), { replace: true })
        return
      } else {
        const res = await api<{ user: User; token: string }>('/auth/register', { method: 'POST', body: f })
        tokenStore.set(res.token)
        window.location.assign(landingFor(res.user, next))
        return
      }
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="auth-split">
      <div className="auth-poster" aria-hidden="true">
        <h2>{isLogin ? 'Show your pass. Walk straight in.' : 'Book a seat. Get your pass.'}</h2>
      </div>
      <div className="auth-form">
        <div className="auth-card">
      <h1>{isLogin ? 'Sign in' : 'Create your account'}</h1>
      
      <p className="lede-sub" style={{ marginTop: 8, marginBottom: 24 }}>
        {isLogin ? 'Your passes and bookings are waiting.' : 'Book seats at security events and keep your passes in one place.'}
      </p>
      <form onSubmit={onSubmit} className="stack">
        {error && <Notice tone="error">{error}</Notice>}
        {!isLogin && (
          <label className="field">
            Full name
            <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
          </label>
        )}
        <label className="field">
          Email
          <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="username" />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            required
            minLength={isLogin ? undefined : 8}
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
        </label>
        {!isLogin && (
          <label className="field">
            Confirm password
            <input
              type="password"
              required
              value={f.password_confirmation}
              onChange={(e) => setF({ ...f, password_confirmation: e.target.value })}
              autoComplete="new-password"
            />
          </label>
        )}
        <button className="btn" disabled={busy}>
          {busy ? 'One moment…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="switch">
        {isLogin ? (
          <>
            New here? <Link to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}>Create an account</Link>
          </>
        ) : (
          <>
            Already registered? <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>Sign in</Link>
          </>
        )}
      </p>
        </div>
      </div>
    </div>
  )
}

