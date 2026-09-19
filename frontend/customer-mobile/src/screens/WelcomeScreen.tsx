import { useEffect, useRef } from 'react'
import { BRAND } from '../lib/brand'
import { StatusBar } from 'expo-status-bar'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PosterArt } from '../components/PosterArt'
import HeroTicket from '../components/fx/HeroTicket'
import { Button } from '../components/ui'
import { fonts, type Palette } from '../theme'
import { useStyles } from '../lib/themeMode'
import type { RootParamList } from '../../App'

const PERIOD = 48

// The first thing anyone sees: what UCYSS is, and two clear ways in.
export default function WelcomeScreen({ navigation }: NativeStackScreenProps<RootParamList, 'Welcome'>) {
  const s = useStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const drift = useRef(new Animated.Value(0)).current
  const enter = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // The checkerboard slides one full tile, then starts over, so the movement never visibly restarts.
    const loop = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }))
    loop.start()
    Animated.timing(enter, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    return () => loop.stop()
  }, [drift, enter])

  const slide = drift.interpolate({ inputRange: [0, 1], outputRange: [0, PERIOD] })
  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] })

  return (
    <View style={s.screen}>
      {/* Orange background in both themes: dark clock and battery */}
      <StatusBar style="dark" />
      <Animated.View style={[s.field, { transform: [{ translateX: slide }, { translateY: slide }] }]}>
        <PosterArt category="ctf" />
      </Animated.View>

      <View style={[s.top, { paddingTop: insets.top + 24 }]}>
        <Text style={s.brand}>{BRAND.name}</Text>
      </View>

      <View style={s.middle}>
        <Animated.View style={{ alignItems: 'center', opacity: enter, transform: [{ translateY: rise }] }}>
          <HeroTicket />
        </Animated.View>
        <Animated.View style={{ opacity: enter, transform: [{ translateY: rise }], gap: 12, marginTop: 28 }}>
          <Text style={s.title}>Security events, booked in seconds.</Text>
          <Text style={s.lede}>CTFs, bootcamps, conferences and workshops. Get a signed QR pass on your phone and walk straight in.</Text>
        </Animated.View>
      </View>

      <View style={[s.actions, { paddingBottom: insets.bottom + 20 }]}>
        <Button title="Create account" variant="dark" onPress={() => navigation.navigate('Register')} />
        <Button title="Sign in" variant="quiet" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  )
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.accent, overflow: 'hidden' },
  // Bigger than the screen by one tile on each side, so sliding it never shows an edge.
  field: { position: 'absolute', top: -PERIOD, left: -PERIOD, right: 0, bottom: 0 },
  top: { paddingHorizontal: 24 },
  brand: { fontFamily: fonts.heavy, fontSize: 22, letterSpacing: -0.5, color: colors.onAccent },
  middle: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontFamily: fonts.heavy, fontSize: 40, lineHeight: 42, letterSpacing: -1.4, color: colors.onAccent },
  lede: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.onAccent },
  actions: { paddingHorizontal: 24, gap: 10 },
})
