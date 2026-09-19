import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CaretLeft } from 'phosphor-react-native'
import { errorText } from '../lib/api'
import { useAuth } from '../lib/auth'
import KeyboardScreen from '../components/KeyboardScreen'
import { PosterArt } from '../components/PosterArt'
import { Button, Field, Notice } from '../components/ui'
import { fonts, lightColors, type Palette } from '../theme'
import { useStyles, useTheme } from '../lib/themeMode'
import type { RootParamList } from '../../App'

// One screen for both, with a different poster, heading and fields. Signing in or up lands you in the app.
export default function AuthScreen({ navigation, route }: NativeStackScreenProps<RootParamList, 'Login' | 'Register'>) {
  const { colors } = useTheme()
  const s = useStyles(makeStyles)
  const isLogin = route.name === 'Login'
  const { signIn, register } = useAuth()
  const insets = useSafeAreaInsets()
  const [f, setF] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function problem(): string | null {
    if (!isLogin && !f.name.trim()) return 'Enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return 'Enter a valid email address.'
    if (!isLogin && f.password.length < 8) return 'Choose a password of at least 8 characters.'
    if (!isLogin && f.password !== f.password_confirmation) return 'The two passwords do not match.'
    if (isLogin && !f.password) return 'Enter your password.'
    return null
  }

  async function submit() {
    const bad = problem()
    if (bad) return setError(bad)
    setBusy(true)
    setError(null)
    try {
      if (isLogin) await signIn(f.email.trim(), f.password)
      else await register({ ...f, name: f.name.trim(), email: f.email.trim() })
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.concrete }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[s.poster, { paddingTop: insets.top + 12 }]}>
          <PosterArt category={isLogin ? 'bootcamp' : 'ctf'} />
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} hitSlop={12} style={s.back}>
            <CaretLeft size={26} weight="bold" color={isLogin ? lightColors.paper : lightColors.ink} />
          </Pressable>
          <Text style={[s.title, { color: isLogin ? lightColors.paper : lightColors.ink }]}>{isLogin ? 'Welcome back.' : 'Create your account.'}</Text>
        </View>

        <View style={s.form}>
          <Text style={s.sub}>{isLogin ? 'Sign in to see events and your passes.' : 'It takes a minute. Then you can book seats and keep your passes here.'}</Text>
          {error && <Notice tone="error" text={error} />}
          {!isLogin && <Field label="Full name" value={f.name} onChangeText={(name) => setF({ ...f, name })} autoCapitalize="words" autoComplete="name" textContentType="name" />}
          <Field label="Email" value={f.email} onChangeText={(email) => setF({ ...f, email })} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Field
            label="Password"
            hint={isLogin ? undefined : 'At least 8 characters.'}
            value={f.password}
            onChangeText={(password) => setF({ ...f, password })}
            secureTextEntry
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            textContentType={isLogin ? 'password' : 'newPassword'}
            onSubmitEditing={isLogin ? submit : undefined}
          />
          {!isLogin && (
            <Field
              label="Confirm password"
              value={f.password_confirmation}
              onChangeText={(password_confirmation) => setF({ ...f, password_confirmation })}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={submit}
            />
          )}
          {isLogin && (
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
              <Text style={s.forgot}>Forgot your password?</Text>
            </Pressable>
          )}
          <Button title={isLogin ? 'Sign in' : 'Create account'} variant="dark" onPress={submit} busy={busy} />
          <Button
            title={isLogin ? 'New here? Create an account' : 'Already registered? Sign in'}
            variant="quiet"
            onPress={() => navigation.replace(isLogin ? 'Register' : 'Login')}
          />
        </View>
    </KeyboardScreen>
  )
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  poster: { minHeight: 200, paddingHorizontal: 20, paddingBottom: 24, justifyContent: 'space-between', overflow: 'hidden' },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  title: { fontFamily: fonts.heavy, fontSize: 36, lineHeight: 38, letterSpacing: -1 },
  form: { padding: 20, gap: 16 },
  sub: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  forgot: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
})
