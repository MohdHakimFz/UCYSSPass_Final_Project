import { useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { colors, fonts } from '../../theme'

export type SeatBlock = { id: number | string; name: string; capacity: number; remaining: number }

const MAX_SEATS = 60
const COLS = 10
const GAP = 5

function hash(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

// Which seats look taken is spread out the same way every time, so a block never reshuffles between renders.
function seatsFor(block: SeatBlock, index: number) {
  const shown = Math.max(1, Math.min(block.capacity, MAX_SEATS))
  const ratio = block.capacity ? (block.capacity - block.remaining) / block.capacity : 1
  let taken = Math.round(ratio * shown)
  if (block.remaining > 0) taken = Math.min(taken, shown - 1)
  const takenIdx = new Set(
    Array.from({ length: shown }, (_, i) => i)
      .sort((a, b) => hash(a + index * 977) - hash(b + index * 977))
      .slice(0, taken),
  )
  return Array.from({ length: shown }, (_, i) => !takenIdx.has(i))
}

/**
 * The room in 3D, for a phone. Every ticket tier is a block of seats laid out on a tilted floor. Free seats are
 * bright and raised, taken ones are dark. A pool of light follows your finger and sweeps by itself when idle.
 * It shows live availability per tier; the seat itself is assigned by the organiser.
 */
export default function SeatMap3D({
  blocks,
  selectedId,
  onSelect,
  caption,
}: {
  blocks: SeatBlock[]
  selectedId?: number | string | null
  onSelect?: (id: number | string) => void
  caption?: string
}) {
  const [width, setWidth] = useState(0)
  const [still, setStill] = useState(false)
  const rise = useRef(new Animated.Value(0)).current
  const lightX = useRef(new Animated.Value(0)).current
  const lightY = useRef(new Animated.Value(0)).current
  const lightOn = useRef(new Animated.Value(0.7)).current
  const touching = useRef(false)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setStill)
  }, [])

  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [rise])

  // Idle: the light drifts back and forth across the room until a finger takes over.
  useEffect(() => {
    if (still || !width) return
    lightX.setValue(width * 0.2)
    lightY.setValue(120)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(lightX, { toValue: width * 0.8, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(lightX, { toValue: width * 0.2, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [lightX, lightY, width, still])

  const seat = width ? (width - 32 - GAP * (COLS - 1) - 24) / COLS : 0
  const layouts = useMemo(() => blocks.map((b, i) => seatsFor(b, i)), [blocks])
  const glow = Math.max(width, 240) * 0.7

  return (
    <View
      style={s.panel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onTouchStart={(e) => {
        touching.current = true
        lightX.stopAnimation()
        lightX.setValue(e.nativeEvent.locationX)
        lightY.setValue(e.nativeEvent.locationY)
        Animated.timing(lightOn, { toValue: 1, duration: 150, useNativeDriver: true }).start()
      }}
      onTouchMove={(e) => {
        lightX.setValue(e.nativeEvent.locationX)
        lightY.setValue(e.nativeEvent.locationY)
      }}
      onTouchEnd={() => {
        touching.current = false
        Animated.timing(lightOn, { toValue: 0.7, duration: 500, useNativeDriver: true }).start()
      }}
    >
      <Animated.View
        style={{
          opacity: rise,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { perspective: 700 }, { rotateX: '28deg' }, { scale: 0.96 }],
        }}
      >
        <View style={s.stage}>
          <Text style={s.stageText}>STAGE</Text>
        </View>

        {blocks.map((b, bi) => {
          const active = selectedId === b.id
          return (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`${b.name}, ${b.remaining > 0 ? `${b.remaining} seats left` : 'sold out'}`}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect?.(b.id)}
              style={[s.block, active && s.blockActive]}
            >
              <View style={s.blockHead}>
                <Text style={s.blockName}>{b.name}</Text>
                <Text style={[s.blockLeft, b.remaining === 0 && { color: '#a3adba' }]}>{b.remaining > 0 ? `${b.remaining} left` : 'Sold out'}</Text>
              </View>
              <View style={s.seats}>
                {layouts[bi].map((free, i) => (
                  <View key={i} style={[{ width: seat, height: seat }, free ? s.seatFree : s.seatTaken]} />
                ))}
              </View>
            </Pressable>
          )
        })}
      </Animated.View>

      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: glow,
            height: glow,
            opacity: lightOn,
            transform: [{ translateX: Animated.add(lightX, -glow / 2) }, { translateY: Animated.add(lightY, -glow / 2) }],
          }}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="room-light" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#ffd6be" stopOpacity="0.42" />
                <Stop offset="0.45" stopColor="#ff9c78" stopOpacity="0.14" />
                <Stop offset="1" stopColor="#ff9c78" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#room-light)" />
          </Svg>
        </Animated.View>
      )}

      <Text style={s.caption}>{caption ?? 'Live availability. Bright seats are free; the organiser assigns your exact seat.'}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  panel: { backgroundColor: '#0d1015', padding: 16, paddingBottom: 12, overflow: 'hidden', borderWidth: 2, borderColor: colors.ink },
  stage: { alignSelf: 'center', width: '64%', paddingVertical: 8, marginBottom: 14, backgroundColor: colors.accent, alignItems: 'center', shadowColor: colors.accent, shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  stageText: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 5, color: colors.ink },
  block: { marginBottom: 14, padding: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.03)' },
  blockActive: { borderColor: colors.accent, backgroundColor: 'rgba(228,98,63,0.12)' },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  blockName: { fontFamily: fonts.heavy, fontSize: 14, color: '#edeff2' },
  blockLeft: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  // The thicker bottom edge is what makes each square read as a raised block.
  seatFree: { backgroundColor: colors.accent, borderBottomWidth: 4, borderBottomColor: '#a53c22', shadowColor: colors.accent, shadowOpacity: 0.8, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  seatTaken: { backgroundColor: '#2c3644', borderBottomWidth: 2, borderBottomColor: '#151a22' },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: '#a3adba', marginTop: 4 },
})
