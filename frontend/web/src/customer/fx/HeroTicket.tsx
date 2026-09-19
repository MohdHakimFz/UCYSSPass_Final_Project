import Tilt from '@/shared/Tilt'

// A little QR-like pattern drawn from cells: three corner markers plus a fixed scatter. Decorative only.
const CELLS = 9
const MARKERS = [
  [0, 0],
  [CELLS - 3, 0],
  [0, CELLS - 3],
]
const inMarker = (x: number, y: number) => MARKERS.some(([mx, my]) => x >= mx && x < mx + 3 && y >= my && y < my + 3)
const isOn = (x: number, y: number) => {
  if (inMarker(x, y)) {
    const [mx, my] = MARKERS.find(([a, b]) => x >= a && x < a + 3 && y >= b && y < b + 3)!
    return !(x - mx === 1 && y - my === 1)
  }
  return ((x * 7 + y * 13 + x * y) % 5) < 2
}

/** The floating pass in the hero: it sways on its own, tilts toward the cursor, and catches a moving shine. */
export default function HeroTicket({ title, when }: { title: string; when: string }) {
  return (
    <Tilt className="hero-ticket-wrap" max={14} aria-hidden="true">
      <div className="hero-ticket">
        <div className="ht-main">
          <span className="ht-kind">Admit one</span>
          <strong>{title}</strong>
          <span className="ht-when">{when}</span>
          <span className="ht-sign">Signed pass</span>
        </div>
        <div className="ht-stub">
          <div className="ht-qr" style={{ ['--cells' as string]: CELLS }}>
            {Array.from({ length: CELLS * CELLS }, (_, i) => (
              <i key={i} data-on={isOn(i % CELLS, Math.floor(i / CELLS)) || undefined} />
            ))}
          </div>
        </div>
      </div>
    </Tilt>
  )
}
