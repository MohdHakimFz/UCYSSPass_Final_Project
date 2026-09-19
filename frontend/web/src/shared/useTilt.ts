import { useCallback } from 'react'

/**
 * Tilts an element in 3D toward the pointer and tells the stylesheet where the light is.
 * It only writes CSS variables (--rx, --ry, --gx, --gy), so React never re-renders while the pointer moves.
 * Touch works too: dragging a finger across the element tilts it. Reduced-motion users get a flat element.
 *
 * It returns a callback ref, so it keeps working when React swaps the element underneath
 * (for example a placeholder div that becomes a link once data arrives).
 */
export function useTilt<T extends HTMLElement>(max = 9) {
  return useCallback(
    (el: T | null) => {
      if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      let frame = 0

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
          el.dataset.tilting = 'on'
        })
      }

      const rest = () => {
        cancelAnimationFrame(frame)
        for (const v of ['--rx', '--ry', '--gx', '--gy']) el.style.removeProperty(v)
        delete el.dataset.tilting
      }

      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', rest)
      el.addEventListener('pointercancel', rest)
      return () => {
        cancelAnimationFrame(frame)
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerleave', rest)
        el.removeEventListener('pointercancel', rest)
      }
    },
    [max],
  )
}
