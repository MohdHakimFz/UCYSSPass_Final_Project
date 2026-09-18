import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { errorText } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Notice } from '../components/ui'

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [loading, user, navigate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate">
      <aside className="gate-side">
        <div className="wordmark">
          <span>Organiser</span>SentryPass
        </div>
        <div>
          <h1>Run the door as well as the event.</h1>
          <p>Create events and ticket tiers, watch attendees fill in, and check people in by scanning their pass.</p>
        </div>
      </aside>
      <div className="gate-form">
        <form onSubmit={onSubmit}>
          <h2>Sign in</h2>
          {error && <Notice tone="error">{error}</Notice>}
          <label className="field">
            Email
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
