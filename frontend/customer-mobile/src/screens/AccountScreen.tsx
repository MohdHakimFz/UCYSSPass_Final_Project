import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

export default function AccountScreen() {
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
      <View style={{ height: 12 }} />
      <Button title="Edit profile" variant="dark" onPress={() => navigation.navigate('Profile')} />
      <Button title="Sign out" variant="quiet" onPress={signOut} />
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.concrete, padding: 24, gap: 12, justifyContent: 'center' },
  badge: { width: 72, height: 72, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  initial: { fontFamily: fonts.heavy, fontSize: 36, color: colors.ink },
  h1: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft },
})
