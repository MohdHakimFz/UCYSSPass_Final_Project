import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'
import { useIsFocused } from '@react-navigation/native'
import { motionAvailable, sharedTilt, useTiltSensor } from '../../lib/motion'

type Box = { x: number; y: number; w: number; h: number }
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * Wraps a card so it tilts in 3D, with a moving light and a foil sheen.
 *  - Touch: drag a finger over the card and it leans toward it. Scrolling and buttons inside keep working,
 *    because this only listens to touches and never takes them over.
 *  - Phone motion: tilting the phone itself moves the card and the shine.
 *  - Idle: a slow sway so it never looks frozen.
 * Everything runs on the native driver. Turned off when the phone asks to reduce motion.
 * Only the screen in front moves: a card on a screen behind (or in a tab you are not on) stops listening to the
 * sensor and stops swaying, and all cards read one shared set of tilt values (see lib/motion.ts).
 */
export default function Tilt3D({ children, max = 9, style }: { children: ReactNode; max?: number; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null)
  const box = useRef<Box | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [still, setStill] = useState(false)
  const [hasMotion, setHasMotion] = useState(false)
  const touching = useRef(false)
  const focused = useIsFocused()
  const moving = focused && !still

  // The finger's position, used while touching. The phone's lean comes from sharedTilt.
  const touchX = useRef(new Animated.Value(0)).current
  const touchY = useRef(new Animated.Value(0)).current
  const touchGx = useRef(new Animated.Value(0.5)).current
  const touchGy = useRef(new Animated.Value(0.5)).current
  const touchLit = useRef(new Animated.Value(0)).current
  // 1 follows the phone, 0 follows the finger; it glides between the two when a touch starts and ends.
  const follow = useRef(new Animated.Value(1)).current
  const sway = useRef(new Animated.Value(0)).current

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setStill)
    void motionAvailable().then(setHasMotion)
  }, [])

  useTiltSensor(moving && hasMotion)

  // Only sway on its own when the phone has no motion sensor, and only while this screen is in front.
  useEffect(() => {
    if (!moving || hasMotion) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [sway, moving, hasMotion])

  function measure(after?: () => void) {
    ref.current?.measureInWindow((x, y, w, h) => {
      box.current = { x, y, w, h }
      after?.()
    })
  }

  function point(e: GestureResponderEvent) {
    const b = box.current
    if (!b || !b.w) return
    const nx = clamp((e.nativeEvent.pageX - b.x) / b.w, 0, 1)
    const ny = clamp((e.nativeEvent.pageY - b.y) / b.h, 0, 1)
    touchX.setValue((0.5 - ny) * 2)
    touchY.setValue((nx - 0.5) * 2)
    touchGx.setValue(nx)
    touchGy.setValue(ny)
    touchLit.setValue(1)
  }

  function release() {
    touching.current = false
    Animated.parallel([
      Animated.spring(touchX, { toValue: 0, useNativeDriver: true, friction: 6 }),
      Animated.spring(touchY, { toValue: 0, useNativeDriver: true, friction: 6 }),
      Animated.timing(touchLit, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(follow, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start()
  }

  // The animated sums are built once per size change, not on every render.
  const anim = useMemo(() => {
    const fingerShare = Animated.add(1, Animated.multiply(follow, -1))
    const mix = (phone: Animated.Value, finger: Animated.Value) => Animated.add(Animated.multiply(phone, follow), Animated.multiply(finger, fingerShare))
    const gx = mix(sharedTilt.gx, touchGx)
    const gy = mix(sharedTilt.gy, touchGy)
    const blob = Math.max(size.w, size.h) * 1.5
    return {
      rotX: Animated.add(touchX, Animated.add(Animated.multiply(sharedTilt.x, follow), Animated.multiply(sway, 0.22))),
      rotY: Animated.add(touchY, Animated.add(Animated.multiply(sharedTilt.y, follow), Animated.multiply(sway, 0.3))),
      lit: Animated.add(Animated.multiply(sharedTilt.lit, follow), touchLit),
      blob,
      glareX: Animated.add(Animated.multiply(gx, size.w), -blob / 2),
      glareY: Animated.add(Animated.multiply(gy, size.h), -blob / 2),
      foilShift: Animated.add(Animated.multiply(gx, size.w * 0.7), -size.w * 0.6),
    }
  }, [follow, touchGx, touchGy, touchX, touchY, touchLit, sway, size.w, size.h])
  const { rotX, rotY, lit, blob, glareX, glareY, foilShift } = anim

  if (still) return <View style={style}>{children}</View>

  return (
    <Animated.View
      ref={ref}
      style={[
        style,
        {
          transform: [
            { perspective: 900 },
            { rotateX: rotX.interpolate({ inputRange: [-1, 1], outputRange: [`${max}deg`, `${-max}deg`] }) },
            { rotateY: rotY.interpolate({ inputRange: [-1, 1], outputRange: [`${-max}deg`, `${max}deg`] }) },
          ],
        },
      ]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      onTouchStart={(e) => {
        touching.current = true
        follow.setValue(0)
        const ev = { nativeEvent: { pageX: e.nativeEvent.pageX, pageY: e.nativeEvent.pageY } } as GestureResponderEvent
        measure(() => point(ev))
      }}
      onTouchMove={point}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      {children}
      {size.w > 0 && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <Animated.View style={{ position: 'absolute', width: size.w * 1.6, height: size.h, opacity: Animated.multiply(lit, 0.9), transform: [{ translateX: foilShift }] }}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="foil" x1="0" y1="0" x2="1" y2="0.4">
                  <Stop offset="0.25" stopColor="#ff7850" stopOpacity="0" />
                  <Stop offset="0.38" stopColor="#ff7850" stopOpacity="0.32" />
                  <Stop offset="0.48" stopColor="#ffe28c" stopOpacity="0.34" />
                  <Stop offset="0.58" stopColor="#78dcff" stopOpacity="0.32" />
                  <Stop offset="0.68" stopColor="#be8cff" stopOpacity="0.24" />
                  <Stop offset="0.8" stopColor="#be8cff" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#foil)" />
            </Svg>
          </Animated.View>
          <Animated.View style={{ position: 'absolute', width: blob, height: blob, opacity: lit, transform: [{ translateX: glareX }, { translateY: glareY }] }}>
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient id="glare" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
                  <Stop offset="0.35" stopColor="#ffffff" stopOpacity="0.14" />
                  <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#glare)" />
            </Svg>
          </Animated.View>
        </View>
      )}
    </Animated.View>
  )
}
