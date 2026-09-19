import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui'
import { fonts, type Palette } from '../theme'
import { useStyles, useTheme, type ThemeMode } from '../lib/themeMode'
import type { RootParamList } from '../../App'

const CHOICES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function AccountScreen() {
  const s = useStyles(makeStyles)
  const { mode, setMode } = useTheme()
  const { user, signOut } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>()

  return (
    <View style={s.wrap}>
      <View style={s.badge}>
        <Text style={s.initial}>{user?.name.trim().charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={s.h1}>{user?.name}</Text>
      <Text style={s.sub}>{user?.email}</Text>
      {user?.is_member && <Text style={s.sub}>UCYSS member</Text>}
      <Text style={s.label}>Appearance</Text>
      <View style={s.choices} accessibilityRole="radiogroup">
        {CHOICES.map((c) => (
          <Pressable key={c.value} accessibilityRole="radio" accessibilityState={{ selected: mode === c.value }} onPress={() => setMode(c.value)} style={[s.choice, mode === c.value && s.choiceOn]}>
            <Text style={[s.choiceText, mode === c.value && s.choiceTextOn]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ height: 12 }} />
      <Button title="Edit profile" variant="dark" onPress={() => navigation.navigate('Profile')} />
      <Button title="Sign out" variant="quiet" onPress={signOut} />
    </View>
  )
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.concrete, padding: 24, gap: 12, justifyContent: 'center' },
  badge: { width: 72, height: 72, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  initial: { fontFamily: fonts.heavy, fontSize: 36, color: colors.onAccent },
  h1: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: 12 },
  choices: { flexDirection: 'row' },
  choice: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.ink, marginRight: -2 },
  choiceOn: { backgroundColor: colors.ink },
  choiceText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  choiceTextOn: { color: colors.concrete },
})
