import { useEffect, useRef, useState } from 'react'
import { enableMotion, subscribeTilt } from '@/shared/motion'
import type { SeatInfo } from '@/lib/api'

export type SeatBlock = { id: number | string; name: string; capacity: number; remaining: number }

/** Present when the event has numbered seats: real seats to choose from, instead of a picture of availability. */
export type SeatPick = {
  seats: Record<string, SeatInfo[]>
  value: { tierId: number | string; seatId: number } | null
  onPick: (tierId: number | string, seat: SeatInfo | null) => void
}

const MAX_SEATS = 84
const COLS = 10

// Which seats look taken is spread out the same way every time, so a block never reshuffles between renders.
function hash(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

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

function rowsOf(seats: SeatInfo[]) {
  const rows = new Map<string, SeatInfo[]>()
  for (const s of seats) rows.set(s.row, [...(rows.get(s.row) ?? []), s])
  return [...rows.entries()]
}

/**
 * A room in 3D. Every seat is a small chair: a cushion with a backrest. Free chairs stand up and glow, taken ones
 * sit low and dark, and a pool of light follows the pointer, or the lean of a phone.
 *
 * Without `pick` it is a picture of live availability per ticket tier (used on the home page and for events without
 * numbered seats). With `pick` every chair is a real seat you can choose.
 */
export default function SeatMap({
  blocks,
  selectedId,
  onSelect,
  pick,
  caption,
}: {
  blocks: SeatBlock[]
  selectedId?: number | string | null
  onSelect?: (id: number | string) => void
  pick?: SeatPick
  caption?: string
}) {
  const room = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = room.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return setSeen(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const el = room.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--px', `${e.clientX - r.left}px`)
        el.style.setProperty('--py', `${e.clientY - r.top}px`)
        el.style.setProperty('--turn', `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`)
        el.dataset.lit = 'on'
      })
    }
    const off = () => {
      cancelAnimationFrame(frame)
      delete el.dataset.lit
      el.style.removeProperty('--turn')
    }
    const lean = (x: number, y: number) => {
      if (el.matches(':hover')) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--px', `${r.width * (0.5 + y * 0.45)}px`)
      el.style.setProperty('--py', `${r.height * (0.45 + x * 0.35)}px`)
      el.style.setProperty('--turn', `${(y * 8).toFixed(2)}deg`)
      el.dataset.lit = 'on'
    }
    const down = () => void enableMotion()
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', off)
    el.addEventListener('pointerdown', down)
    const unsubscribe = subscribeTilt(lean)
    return () => {
      cancelAnimationFrame(frame)
      unsubscribe()
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', off)
      el.removeEventListener('pointerdown', down)
    }
  }, [])

  const chosen = pick?.value ? pick.seats[String(pick.value.tierId)]?.find((s) => s.id === pick.value!.seatId) : null

  return (
    <figure className="seatmap" ref={room} data-seen={seen || undefined} data-pick={pick ? '' : undefined}>
      <div className="seatmap-scene" aria-hidden={pick ? undefined : true}>
        <div className="seatmap-stage" aria-hidden="true">
          Stage
        </div>
        <div className="seatmap-blocks">
          {blocks.map((b, bi) => {
            const real = pick?.seats[String(b.id)]
            const inner = (
              <>
                <span className="seatmap-name">
                  {b.name}
                  <em>{b.remaining > 0 ? `${b.remaining} left` : 'Sold out'}</em>
                </span>
                {real ? (
                  <span className="seatmap-rows">
                    {rowsOf(real).map(([row, seats]) => (
                      <span className="seatmap-row" key={row} style={{ ['--cols' as string]: seats.length }}>
                        <span className="row-label" aria-hidden="true">
                          {row}
                        </span>
                        {seats.map((s, i) => {
                          const picked = pick!.value?.tierId === b.id && pick!.value.seatId === s.id
                          return (
                            <span
                              key={s.id}
                              role="button"
                              tabIndex={s.taken ? -1 : 0}
                              className="seat"
                              data-free={!s.taken || undefined}
                              data-picked={picked || undefined}
                              aria-disabled={s.taken}
                              aria-label={`Seat ${s.label}, ${s.taken ? 'taken' : picked ? 'your choice' : 'free'}`}
                              aria-pressed={picked}
                              title={`Seat ${s.label}`}
                              style={{ ['--i' as string]: i }}
                              onClick={() => !s.taken && pick!.onPick(b.id, picked ? null : s)}
                              onKeyDown={(e) => {
                                if ((e.key === 'Enter' || e.key === ' ') && !s.taken) {
                                  e.preventDefault()
                                  pick!.onPick(b.id, picked ? null : s)
                                }
                              }}
                            />
                          )
                        })}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="seatmap-seats" style={{ ['--cols' as string]: COLS }}>
                    {seatsFor(b, bi).map((free, i) => (
                      <i key={i} className="seat" data-free={free || undefined} style={{ ['--i' as string]: i }} />
                    ))}
                  </span>
                )}
              </>
            )

            return pick ? (
              <div key={b.id} className="seatmap-block" data-active={pick.value?.tierId === b.id || undefined} data-soldout={b.remaining === 0 || undefined}>
                {inner}
              </div>
            ) : (
              <button
                key={b.id}
                type="button"
                className="seatmap-block"
                data-active={selectedId === b.id || undefined}
                data-soldout={b.remaining === 0 || undefined}
                onClick={() => onSelect?.(b.id)}
                tabIndex={-1}
              >
                {inner}
              </button>
            )
          })}
        </div>
      </div>
      <div className="seatmap-light" aria-hidden="true" />
      <figcaption>
        {pick
          ? chosen
            ? `Seat ${chosen.label} is yours to book. Tap it again to change your mind.`
            : 'Pick any glowing seat. Dark seats are taken.'
          : (caption ?? 'Live availability. Free seats glow; the organiser assigns your exact seat.')}
      </figcaption>
    </figure>
  )
}
