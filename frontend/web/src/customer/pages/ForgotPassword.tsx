import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorText } from '@/lib/api'
import { Notice } from '@/customer/ui'

// Two steps on one page: ask for a code by email, then enter the code with a new password.
export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [f, setF] = useState({ email: '', code: '', password: '', password_confirmation: '' })
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email: f.email } })
      setInfo(res.message)
      setStep('code')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (f.password !== f.password_confirmation) return setError('The two passwords do not match.')
    setBusy(true)
    setError(null)
    try {
      await api('/auth/reset-password', { method: 'POST', body: f })
      navigate('/login?reset=1', { replace: true })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-poster" aria-hidden="true">
        <h2>Locked out? Back in a minute.</h2>
      </div>
      <div className="auth-form">
        <div className="auth-card">
          <h1>{step === 'email' ? 'Reset your password' : 'Enter your code'}</h1>
          <p className="lede-sub" style={{ marginTop: 8, marginBottom: 24 }}>
            {step === 'email'
              ? 'Enter the email you signed up with and we will send a six-digit code.'
              : `We sent a six-digit code to ${f.email}. It works for 30 minutes.`}
          </p>

          {step === 'email' ? (
            <form onSubmit={sendCode} className="stack">
              {error && <Notice tone="error">{error}</Notice>}
              <label className="field">
                Email
                <input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="username" />
              </label>
              <button className="btn" disabled={busy}>
                {busy ? 'Sending…' : 'Send the code'}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="stack">
              {info && <Notice tone="ok">{info}</Notice>}
              {error && <Notice tone="error">{error}</Notice>}
              <label className="field">
                Six-digit code
                <input
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={f.code}
                  onChange={(e) => setF({ ...f, code: e.target.value.replace(/\D/g, '') })}
                />
              </label>
              <label className="field">
                New password
                <input type="password" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />
              </label>
              <label className="field">
                Confirm new password
                <input
                  type="password"
                  required
                  value={f.password_confirmation}
                  onChange={(e) => setF({ ...f, password_confirmation: e.target.value })}
                  autoComplete="new-password"
                />
              </label>
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Change password'}
              </button>
              <button type="button" className="btn-quiet" onClick={() => { setStep('email'); setError(null) }}>
                Use a different email or send a new code
              </button>
            </form>
          )}

          <p className="switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
