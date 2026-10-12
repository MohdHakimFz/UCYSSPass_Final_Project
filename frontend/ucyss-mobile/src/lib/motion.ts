import { useEffect } from 'react'
import { Animated } from 'react-native'
import { DeviceMotion } from 'expo-sensors'

/**
 * Phone lean, shared by every 3D card on screen. Tilt the phone left and y goes negative, right and y goes
 * positive; tip the top away from you and x changes the other way. Both are in the range -1 to 1.
 *
 * It is relative, not absolute: whatever angle you hold the phone at when you open the screen counts as flat,
 * and that reference slowly follows you, so lying back on a sofa works as well as sitting up.
 */
type Listener = (x: number, y: number) => void

// About 29 degrees of lean is a full -1 or 1.
const RANGE = 0.5
// 1 makes the card lean the same way as the phone. Set to -1 if it feels backwards on your device.
export const FOLLOW = 1
// How quickly the "flat" reference follows the phone (per update). Small, so quick tilts still register.
const DRIFT = 0.004
// How much of each new reading is used, so the card glides instead of jittering.
const SMOOTH = 0.3

/**
 * One set of animated values for the phone's lean, shared by every 3D card on screen.
 * The sensor writes them once per reading, however many cards there are. (Before, each card kept its own copy,
 * so a list of 30 passes meant 150 updates 30 times a second on the JavaScript thread: the app lagged, the back
 * button got stuck and memory kept growing until Android closed the app.)
 */
export const sharedTilt = {
  x: new Animated.Value(0),
  y: new Animated.Value(0),
  /** Where the light falls, 0 to 1 across and down the card. */
  gx: new Animated.Value(0.5),
  gy: new Animated.Value(0.5),
  /** How strong the light is, 0 to 1. */
  lit: new Animated.Value(0),
}

const listeners = new Set<Listener>()
let sub: { remove: () => void } | null = null
let starting = false
let base: { beta: number; gamma: number } | null = null
let x = 0
let y = 0

const clamp = (n: number) => Math.min(1, Math.max(-1, n))

async function start() {
  if (starting || sub) return
  starting = true
  try {
    if (!(await DeviceMotion.isAvailableAsync())) return
    await DeviceMotion.requestPermissionsAsync().catch(() => undefined)
    if (!listeners.size) return
    DeviceMotion.setUpdateInterval(33)
    sub = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return
      base ??= { beta: rotation.beta, gamma: rotation.gamma }
      base.beta += (rotation.beta - base.beta) * DRIFT
      base.gamma += (rotation.gamma - base.gamma) * DRIFT
      x += (clamp(((rotation.beta - base.beta) / RANGE) * FOLLOW) - x) * SMOOTH
      y += (clamp(((rotation.gamma - base.gamma) / RANGE) * FOLLOW) - y) * SMOOTH
      sharedTilt.x.setValue(x)
      sharedTilt.y.setValue(y)
      sharedTilt.gx.setValue(0.5 + y * 0.5)
      sharedTilt.gy.setValue(0.5 + x * 0.5)
      sharedTilt.lit.setValue(Math.min(1, Math.hypot(x, y) * 1.8))
      listeners.forEach((fn) => fn(x, y))
    })
  } catch {
    /* no motion sensor: the cards fall back to touch and a gentle sway */
  } finally {
    starting = false
  }
}

function stop() {
  sub?.remove()
  sub = null
  base = null
  x = 0
  y = 0
  sharedTilt.x.setValue(0)
  sharedTilt.y.setValue(0)
  sharedTilt.gx.setValue(0.5)
  sharedTilt.gy.setValue(0.5)
  sharedTilt.lit.setValue(0)
}

/**
 * Keeps the sensor on while `active` is true (for example, while a screen with 3D cards is in front).
 * When nothing on screen needs it, the sensor stops completely.
 */
export function useTiltSensor(active: boolean) {
  useEffect(() => {
    if (!active) return
    // A new function each time: the listeners are a Set, so a shared one would be counted once for all cards.
    return subscribeTilt(() => undefined)
  }, [active])
}

export async function motionAvailable(): Promise<boolean> {
  try {
    return await DeviceMotion.isAvailableAsync()
  } catch {
    return false
  }
}

/** Calls fn with the phone's lean until the returned function is called. One sensor feeds every subscriber. */
export function subscribeTilt(fn: Listener): () => void {
  listeners.add(fn)
  if (listeners.size === 1) void start()
  return () => {
    listeners.delete(fn)
    if (!listeners.size) stop()
  }
}
