import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BASE } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Button } from '../components/ui'
import { colors, fonts } from '../theme'
import type { RootParamList } from '../../App'

export default function AccountScreen() {
  const { user, signOut } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>()

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>{user ? user.name : 'You\'re browsing as a guest.'}</Text>
      <Text style={s.sub}>{user ? user.email : 'Sign in to book seats and see your passes.'}</Text>
      {user ? (
        <>
          <Button title="Edit profile" onPress={() => navigation.navigate('Profile')} />
          <Button title="Sign out" variant="quiet" onPress={signOut} />
        </>
      ) : (
        <>
          <Button title="Sign in" onPress={() => navigation.navigate('Login')} />
          <Button title="Create account" variant="quiet" onPress={() => navigation.navigate('Register')} />
        </>
      )}
      <Text style={[s.sub, { marginTop: 24 }]}>Connected to {BASE}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.concrete, padding: 24, gap: 14, justifyContent: 'center' },
  h1: { fontFamily: fonts.heavy, fontSize: 28, lineHeight: 32, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
})
