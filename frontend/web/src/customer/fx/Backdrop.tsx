import { useEffect, useRef } from 'react'

// Ghost tickets that rise slowly through the background. Position, size, speed and delay differ so they never sync.
const GHOSTS = [
  { left: '6%', size: 150, dur: 46, delay: -8, rot: -12 },
  { left: '19%', size: 96, dur: 38, delay: -30, rot: 9 },
  { left: '34%', size: 180, dur: 58, delay: -20, rot: 6 },
  { left: '52%', size: 110, dur: 42, delay: -2, rot: -7 },
  { left: '68%', size: 160, dur: 52, delay: -36, rot: 14 },
  { left: '82%', size: 100, dur: 36, delay: -14, rot: -10 },
  { left: '92%', size: 140, dur: 60, delay: -44, rot: 5 },
]

/**
 * The page background: drifting dots, two slow glows, a scanner beam, tickets floating upward,
 * and a pool of light that follows the cursor. Everything is decorative and CSS-driven; only the
 * cursor position is written to a variable, so nothing re-renders.
 */
export default function Backdrop() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${e.clientX}px`)
        el.style.setProperty('--my', `${e.clientY}px`)
      })
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
    }
  }, [])

  return (
    <div className="backdrop" ref={root} aria-hidden="true">
      <div className="bd-dots" />
      <div className="bd-glow bd-glow-a" />
      <div className="bd-glow bd-glow-b" />
      <div className="bd-spot" />
      <div className="bd-beam" />
      {GHOSTS.map((g, i) => (
        <div
          key={i}
          className="bd-ticket"
          style={{ left: g.left, width: g.size, height: g.size * 0.56, ['--dur' as string]: `${g.dur}s`, ['--delay' as string]: `${g.delay}s`, ['--rot' as string]: `${g.rot}deg` }}
        >
          <i />
        </div>
      ))}
    </div>
  )
}
