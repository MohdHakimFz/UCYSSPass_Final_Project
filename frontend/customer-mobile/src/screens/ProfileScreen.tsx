import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { api, errorText } from '../lib/api'
import { useAuth } from '../lib/auth'
import KeyboardScreen from '../components/KeyboardScreen'
import { Button, Field, Notice } from '../components/ui'
import { colors, fonts } from '../theme'

type Note = { tone: 'ok' | 'error'; text: string } | null

export default function ProfileScreen() {
  const { user, refresh } = useAuth()
  const [details, setDetails] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [detailsNote, setDetailsNote] = useState<Note>(null)
  const [pwNote, setPwNote] = useState<Note>(null)
  const [busy, setBusy] = useState<'details' | 'pw' | null>(null)

  if (!user) return null

  async function saveDetails() {
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

  async function savePassword() {
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
    <KeyboardScreen style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad}>
      <Text style={s.h2}>Your details</Text>
      {detailsNote && <Notice tone={detailsNote.tone} text={detailsNote.text} />}
      <Field label="Full name" value={details.name} onChangeText={(name) => setDetails({ ...details, name })} autoCapitalize="words" autoComplete="name" />
      <Field label="Email" value={details.email} onChangeText={(email) => setDetails({ ...details, email })} keyboardType="email-address" autoComplete="email" />
      <Button title="Save details" onPress={saveDetails} busy={busy === 'details'} />

      <View style={s.rule} />

      <Text style={s.h2}>Change password</Text>
      {pwNote && <Notice tone={pwNote.tone} text={pwNote.text} />}
      <Field label="Current password" value={pw.current_password} onChangeText={(current_password) => setPw({ ...pw, current_password })} secureTextEntry autoComplete="current-password" />
      <Field label="New password" value={pw.password} onChangeText={(password) => setPw({ ...pw, password })} secureTextEntry autoComplete="new-password" />
      <Field label="Confirm new password" value={pw.password_confirmation} onChangeText={(password_confirmation) => setPw({ ...pw, password_confirmation })} secureTextEntry autoComplete="new-password" />
      <Button title="Change password" onPress={savePassword} busy={busy === 'pw'} />
    </KeyboardScreen>
  )
}

const s = StyleSheet.create({
  pad: { padding: 20, gap: 16 },
  h2: { fontFamily: fonts.heavy, fontSize: 20, color: colors.ink },
  rule: { height: 3, backgroundColor: colors.ink, marginVertical: 12 },
})
