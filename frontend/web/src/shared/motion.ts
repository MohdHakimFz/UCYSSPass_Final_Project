/**
 * Phone lean for the web, from the browser's device-orientation sensor. Lean the phone left and y goes negative,
 * right and it goes positive; tip the top away and x changes. Both run from -1 to 1.
 *
 * It is relative: the angle the phone is held at when the page opens counts as flat, and that reference slowly
 * follows you, so it works lying down as well as sitting up. Desktops have no sensor and never call back.
 * iPhones only allow the sensor after a tap, so the first touch on a tilting element asks for permission.
 * On Android the sensor needs a secure page: https, or localhost.
 */
type Listener = (x: number, y: number) => void

// About 30 degrees of lean is a full -1 or 1.
const RANGE = 30
// 1 makes things lean the same way as the phone. Set to -1 if it feels backwards.
export const FOLLOW = 1
const DRIFT = 0.004
const SMOOTH = 0.3

const listeners = new Set<Listener>()
let base: { beta: number; gamma: number } | null = null
let x = 0
let y = 0
let attached = false

const clamp = (n: number) => Math.min(1, Math.max(-1, n))

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta === null || e.gamma === null) return // a desktop browser reports nothing
  base ??= { beta: e.beta, gamma: e.gamma }
  base.beta += (e.beta - base.beta) * DRIFT
  base.gamma += (e.gamma - base.gamma) * DRIFT
  x += (clamp(((e.beta - base.beta) / RANGE) * FOLLOW) - x) * SMOOTH
  y += (clamp(((e.gamma - base.gamma) / RANGE) * FOLLOW) - y) * SMOOTH
  listeners.forEach((fn) => fn(x, y))
}

function attach() {
  if (attached || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return
  window.addEventListener('deviceorientation', onOrientation)
  attached = true
}

function detach() {
  if (!attached) return
  window.removeEventListener('deviceorientation', onOrientation)
  attached = false
  base = null
  x = 0
  y = 0
}

type WithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

/** Asks iOS for the sensor. Must be called from a tap. Elsewhere it does nothing and is safe to call. */
export async function enableMotion(): Promise<void> {
  const ctor = (typeof DeviceOrientationEvent === 'undefined' ? undefined : DeviceOrientationEvent) as WithPermission | undefined
  if (ctor?.requestPermission) {
    try {
      await ctor.requestPermission()
    } catch {
      /* declined: touch still works */
    }
  }
}

export function subscribeTilt(fn: Listener): () => void {
  listeners.add(fn)
  attach()
  return () => {
    listeners.delete(fn)
    if (!listeners.size) detach()
  }
}
