import { useCallback } from 'react'
import { enableMotion, subscribeTilt } from './motion'

/**
 * Tilts an element in 3D toward the pointer and tells the stylesheet where the light is.
 * It only writes CSS variables (--rx, --ry, --gx, --gy, --lit), so React never re-renders while things move.
 *  - Mouse or a dragging finger: the element leans toward the pointer.
 *  - Phone lean: the element turns the way the phone tilts, and the shine slides with it.
 * Reduced-motion users get a flat element.
 *
 * It returns a callback ref, so it keeps working when React swaps the element underneath
 * (for example a placeholder div that becomes a link once data arrives).
 */
export function useTilt<T extends HTMLElement>(max = 9) {
  return useCallback(
    (el: T | null) => {
      if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      let frame = 0
      let pointerDown = false

      const move = (e: PointerEvent) => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect()
          const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
          const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
          el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`)
          el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`)
          el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`)
          el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`)
          el.style.setProperty('--lit', '1')
          el.dataset.tilting = 'on'
        })
      }

      const rest = () => {
        cancelAnimationFrame(frame)
        pointerDown = false
        for (const v of ['--rx', '--ry', '--gx', '--gy', '--lit']) el.style.removeProperty(v)
        delete el.dataset.tilting
      }

      // iPhones only hand over the motion sensor after a tap.
      const down = () => {
        pointerDown = true
        void enableMotion()
      }

      const lean = (x: number, y: number) => {
        if (pointerDown || el.matches(':hover')) return
        el.style.setProperty('--ry', `${(y * max).toFixed(2)}deg`)
        el.style.setProperty('--rx', `${(-x * max).toFixed(2)}deg`)
        el.style.setProperty('--gx', `${(50 + y * 50).toFixed(1)}%`)
        el.style.setProperty('--gy', `${(50 + x * 50).toFixed(1)}%`)
        el.style.setProperty('--lit', Math.min(1, Math.hypot(x, y) * 1.8).toFixed(2))
        el.dataset.tilting = 'on'
      }

      el.addEventListener('pointermove', move)
      el.addEventListener('pointerdown', down)
      el.addEventListener('pointerleave', rest)
      el.addEventListener('pointercancel', rest)
      const unsubscribe = subscribeTilt(lean)
      return () => {
        cancelAnimationFrame(frame)
        unsubscribe()
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerdown', down)
        el.removeEventListener('pointerleave', rest)
        el.removeEventListener('pointercancel', rest)
      }
    },
    [max],
  )
}
