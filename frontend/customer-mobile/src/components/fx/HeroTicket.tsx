import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
// Always the light set: these pieces keep their own look in both themes.
import { lightColors as colors, fonts } from '../../theme'
import Tilt3D from './Tilt3D'

const CELLS = 9
const MARKERS = [
  [0, 0],
  [CELLS - 3, 0],
  [0, CELLS - 3],
]
function isOn(x: number, y: number) {
  const m = MARKERS.find(([a, b]) => x >= a && x < a + 3 && y >= b && y < b + 3)
  if (m) return !(x - m[0] === 1 && y - m[1] === 1)
  return (x * 7 + y * 13 + x * y) % 5 < 2
}

/** The floating pass on the welcome screen: it bobs, leans with your finger or your phone, and catches the light. */
export default function HeroTicket({ title = 'Your next event', when = 'Signed QR pass' }: { title?: string; when?: string }) {
  const bob = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [bob])

  return (
    <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }, { rotate: '-4deg' }] }}>
      <Tilt3D max={14} style={s.ticket}>
        <View style={s.main}>
          <Text style={s.kind}>ADMIT ONE</Text>
          <Text style={s.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={s.when}>{when}</Text>
          <Text style={s.sign}>SIGNED PASS</Text>
        </View>
        <View style={s.stub}>
          <View style={s.qr}>
            {Array.from({ length: CELLS * CELLS }, (_, i) => (
              <View key={i} style={{ width: `${100 / CELLS}%`, aspectRatio: 1, backgroundColor: isOn(i % CELLS, Math.floor(i / CELLS)) ? colors.ink : 'transparent' }} />
            ))}
          </View>
        </View>
      </Tilt3D>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  ticket: { flexDirection: 'row', width: 292, backgroundColor: '#f6f7f9', borderWidth: 2, borderColor: colors.ink, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 16 } },
  main: { flex: 1, padding: 14, gap: 4 },
  kind: { fontFamily: fonts.heavy, fontSize: 10, letterSpacing: 2, color: '#a53c22' },
  title: { fontFamily: fonts.heavy, fontSize: 18, lineHeight: 19, letterSpacing: -0.5, color: colors.ink },
  when: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  sign: { marginTop: 6, paddingTop: 6, fontFamily: fonts.heavy, fontSize: 10, letterSpacing: 1.6, color: colors.ink, borderTopWidth: 2, borderTopColor: 'rgba(20,24,31,0.3)', borderStyle: 'dashed' },
  stub: { width: 98, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink, borderLeftWidth: 2, borderLeftColor: colors.ink, borderStyle: 'dashed' },
  qr: { width: 74, aspectRatio: 1, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', padding: 4 },
})
