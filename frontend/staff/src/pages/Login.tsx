import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, PasswordInput, TextInput } from '@carbon/react'
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
        <div style={{ fontSize: '1rem' }}>
          <strong style={{ fontWeight: 600 }}>SentryPass</strong> Organiser
        </div>
        <div>
          <h1>Run the door as well as the event.</h1>
          <p>Create events and ticket tiers, watch attendees fill in, and check people in by scanning their pass.</p>
        </div>
      </aside>
      <div className="gate-form">
        <form onSubmit={onSubmit} className="stack">
          <h2>Sign in</h2>
          {error && <Notice tone="error">{error}</Notice>}
          <TextInput id="email" type="email" labelText="Email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PasswordInput
            id="password"
            labelText="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy} style={{ width: '100%', maxWidth: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
