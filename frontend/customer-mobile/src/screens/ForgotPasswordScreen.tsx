import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CaretLeft } from 'phosphor-react-native'
import { api, errorText } from '../lib/api'
import { PosterArt } from '../components/PosterArt'
import { Button, Field, Notice } from '../components/ui'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

// Two steps: ask for a six-digit code by email, then enter it with a new password.
export default function ForgotPasswordScreen({ navigation }: NativeStackScreenProps<RootParamList, 'ForgotPassword'>) {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [f, setF] = useState({ email: '', code: '', password: '', password_confirmation: '' })
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function sendCode() {
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError('Enter a valid email address.')
    setBusy(true)
    setError(null)
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: f.email.trim() } })
      setStep('code')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    if (!/^\d{6}$/.test(f.code)) return setError('Enter the six-digit code from the email.')
    if (f.password.length < 8) return setError('Choose a password of at least 8 characters.')
    if (f.password !== f.password_confirmation) return setError('The two passwords do not match.')
    setBusy(true)
    setError(null)
    try {
      await api('/auth/reset-password', { method: 'POST', body: { ...f, email: f.email.trim() } })
      setDone(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.concrete }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[s.poster, { paddingTop: insets.top + 12 }]}>
          <PosterArt category="workshop" />
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
            <CaretLeft size={26} weight="bold" color={colors.ink} />
          </Pressable>
          <Text style={s.title}>{done ? 'All set.' : step === 'email' ? 'Reset your password.' : 'Enter your code.'}</Text>
        </View>

        <View style={s.form}>
          {done ? (
            <>
              <Notice tone="ok" text="Your password has been changed. Sign in with the new one." />
              <Button title="Back to sign in" variant="dark" onPress={() => navigation.navigate('Login')} />
            </>
          ) : step === 'email' ? (
            <>
              <Text style={s.sub}>Enter the email you signed up with and we will send a six-digit code.</Text>
              {error && <Notice tone="error" text={error} />}
              <Field label="Email" value={f.email} onChangeText={(email) => setF({ ...f, email })} keyboardType="email-address" autoComplete="email" onSubmitEditing={sendCode} />
              <Button title="Send the code" variant="dark" onPress={sendCode} busy={busy} />
            </>
          ) : (
            <>
              <Text style={s.sub}>We sent a six-digit code to {f.email}. It works for 30 minutes.</Text>
              {error && <Notice tone="error" text={error} />}
              <Field
                label="Six-digit code"
                value={f.code}
                onChangeText={(code) => setF({ ...f, code: code.replace(/\D/g, '').slice(0, 6) })}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
              />
              <Field label="New password" hint="At least 8 characters." value={f.password} onChangeText={(password) => setF({ ...f, password })} secureTextEntry autoComplete="new-password" />
              <Field
                label="Confirm new password"
                value={f.password_confirmation}
                onChangeText={(password_confirmation) => setF({ ...f, password_confirmation })}
                secureTextEntry
                autoComplete="new-password"
                onSubmitEditing={resetPassword}
              />
              <Button title="Change password" variant="dark" onPress={resetPassword} busy={busy} />
              <Button title="Use a different email or send a new code" variant="quiet" onPress={() => { setStep('email'); setError(null) }} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  poster: { minHeight: 200, paddingHorizontal: 20, paddingBottom: 24, justifyContent: 'space-between', overflow: 'hidden' },
  title: { fontFamily: fonts.heavy, fontSize: 36, lineHeight: 38, letterSpacing: -1, color: colors.ink },
  form: { padding: 20, gap: 16 },
  sub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
})
