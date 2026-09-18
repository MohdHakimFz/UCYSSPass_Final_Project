import { useState } from 'react'
import { api, errorText } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Notice } from '@/customer/ui'

type Note = { tone: 'ok' | 'error'; text: string } | null

export default function Profile() {
  const { user, refresh } = useAuth()
  const [details, setDetails] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [detailsNote, setDetailsNote] = useState<Note>(null)
  const [pwNote, setPwNote] = useState<Note>(null)
  const [busy, setBusy] = useState<'details' | 'pw' | null>(null)

  if (!user) return null

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault()
    setBusy('details')
    setDetailsNote(null)
    try {
      await api(`/users/${user!.id}`, { method: 'PUT', body: details })
      await refresh()
      setDetailsNote({ tone: 'ok', text: 'Profile saved.' })
    } catch (err) {
      setDetailsNote({ tone: 'error', text: errorText(err) })
    } finally {
      setBusy(null)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pw.password !== pw.password_confirmation) {
      setPwNote({ tone: 'error', text: "The new passwords don't match." })
      return
    }
    setBusy('pw')
    setPwNote(null)
    try {
      await api(`/users/${user!.id}`, { method: 'PUT', body: { current_password: pw.current_password, password: pw.password } })
      setPw({ current_password: '', password: '', password_confirmation: '' })
      setPwNote({ tone: 'ok', text: 'Password changed.' })
    } catch (err) {
      setPwNote({ tone: 'error', text: errorText(err) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Profile</h1>
      </div>

      <div className="split">
        <form className="stack" onSubmit={saveDetails}>
          <h2 className="section-title">Your details</h2>
          {detailsNote && <Notice tone={detailsNote.tone}>{detailsNote.text}</Notice>}
          <label className="field">
            Full name
            <input required value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} autoComplete="name" />
          </label>
          <label className="field">
            Email
            <input type="email" required value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} autoComplete="email" />
          </label>
          <div>
            <button className="btn" disabled={busy === 'details'}>
              {busy === 'details' ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </form>

        <form className="stack" onSubmit={savePassword}>
          <h2 className="section-title">Change password</h2>
          {pwNote && <Notice tone={pwNote.tone}>{pwNote.text}</Notice>}
          <label className="field">
            Current password
            <input type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} autoComplete="current-password" />
          </label>
          <label className="field">
            New password
            <input type="password" required minLength={8} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} autoComplete="new-password" />
          </label>
          <label className="field">
            Confirm new password
            <input type="password" required value={pw.password_confirmation} onChange={(e) => setPw({ ...pw, password_confirmation: e.target.value })} autoComplete="new-password" />
          </label>
          <div>
            <button className="btn" disabled={busy === 'pw'}>
              {busy === 'pw' ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
