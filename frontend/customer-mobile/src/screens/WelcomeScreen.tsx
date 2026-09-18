import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PosterArt } from '../components/PosterArt'
import { Button } from '../components/ui'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

// The first thing anyone sees: what SentryPass is, and two clear ways in.
export default function WelcomeScreen({ navigation }: NativeStackScreenProps<RootParamList, 'Welcome'>) {
  const insets = useSafeAreaInsets()

  return (
    <View style={s.screen}>
      <PosterArt category="ctf" />
      <View style={[s.top, { paddingTop: insets.top + 24 }]}>
        <Text style={s.brand}>SentryPass</Text>
      </View>

      <View style={s.middle}>
        <Text style={s.title}>Security events, booked in seconds.</Text>
        <Text style={s.lede}>CTFs, bootcamps, conferences and workshops. Get a signed QR pass on your phone and walk straight in.</Text>
      </View>

      <View style={[s.actions, { paddingBottom: insets.bottom + 20 }]}>
        <Button title="Create account" variant="dark" onPress={() => navigation.navigate('Register')} />
        <Button title="Sign in" variant="quiet" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.accent },
  top: { paddingHorizontal: 24 },
  brand: { fontFamily: fonts.heavy, fontSize: 22, letterSpacing: -0.5, color: colors.ink },
  middle: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
  title: { fontFamily: fonts.heavy, fontSize: 46, lineHeight: 48, letterSpacing: -1.5, color: colors.ink },
  lede: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, color: colors.ink },
  actions: { paddingHorizontal: 24, gap: 10 },
})
