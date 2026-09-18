import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { errorText } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button, Field, Notice } from '../components/ui'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

export default function AuthScreen({ navigation, route }: NativeStackScreenProps<RootParamList, 'Login' | 'Register'>) {
  const isLogin = route.name === 'Login'
  const { user, signIn, register } = useAuth()
  const [f, setF] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigation.goBack()
  }, [user, navigation])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      if (isLogin) await signIn(f.email, f.password)
      else await register(f)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.concrete }} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{isLogin ? 'Sign in' : 'Create your account'}</Text>
      <Text style={s.sub}>{isLogin ? 'Your passes and bookings are waiting.' : 'Book seats at security events and keep your passes in one place.'}</Text>
      {error && <Notice tone="error" text={error} />}
      {!isLogin && <Field label="Full name" value={f.name} onChangeText={(name) => setF({ ...f, name })} autoCapitalize="words" autoComplete="name" />}
      <Field label="Email" value={f.email} onChangeText={(email) => setF({ ...f, email })} keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={f.password} onChangeText={(password) => setF({ ...f, password })} secureTextEntry autoComplete={isLogin ? 'current-password' : 'new-password'} />
      {!isLogin && (
        <Field
          label="Confirm password"
          value={f.password_confirmation}
          onChangeText={(password_confirmation) => setF({ ...f, password_confirmation })}
          secureTextEntry
          autoComplete="new-password"
        />
      )}
      <Button title={isLogin ? 'Sign in' : 'Create account'} onPress={submit} busy={busy} />
      <View style={{ marginTop: 8 }}>
        <Button
          title={isLogin ? 'New here? Create an account' : 'Already registered? Sign in'}
          variant="quiet"
          onPress={() => navigation.replace(isLogin ? 'Register' : 'Login')}
        />
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  pad: { padding: 20, gap: 16 },
  h1: { fontFamily: fonts.heavy, fontSize: 30, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft },
})
