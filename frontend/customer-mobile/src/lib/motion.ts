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
