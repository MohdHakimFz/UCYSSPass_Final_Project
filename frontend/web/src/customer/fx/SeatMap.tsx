import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowsIn, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react'
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
const MIN_ZOOM = 1
const MAX_ZOOM = 3.5
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

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
  const viewport = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  const [zoom, setZoomState] = useState(1)
  const zoomRef = useRef(1)

  // Zoom keeps whatever is in the middle of the view in the middle, so you zoom into the part you are looking at.
  const applyZoom = useCallback((next: number, at?: { x: number; y: number }) => {
    const vp = viewport.current
    const z = clampZoom(next)
    const before = zoomRef.current
    if (z === before) return

    // Zooming with the cursor: remember which seat (or tier) is under it and how far from the cursor it sits,
    // so after the room grows that same spot is still under the cursor.
    const anchor = at ? document.elementFromPoint(at.x, at.y)?.closest<HTMLElement>('.seat, .seatmap-block') : null
    const rect = anchor?.getBoundingClientRect()
    const from = rect && at ? { dx: rect.left + rect.width / 2 - at.x, dy: rect.top + rect.height / 2 - at.y } : null

    // Otherwise zoom about the middle of the view.
    const offsetX = (vp?.clientWidth ?? 0) / 2
    const ratioX = vp && vp.scrollWidth ? (vp.scrollLeft + offsetX) / vp.scrollWidth : 0.5

    zoomRef.current = z
    setZoomState(z)

    // Two frames: the first lets React draw the new size, the second lets the panel resize to fit it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!vp) return
        if (anchor && from && at) {
          const now = anchor.getBoundingClientRect()
          const scale = z / before
          vp.scrollLeft += now.left + now.width / 2 - (at.x + from.dx * scale)
          window.scrollBy(0, now.top + now.height / 2 - (at.y + from.dy * scale))
        } else {
          vp.scrollLeft = ratioX * vp.scrollWidth - offsetX
        }
      }),
    )
  }, [])

  // The room is drawn in perspective, so its near rows look wider and lower than the box it sits in. Keep the
  // stretch small by backing the camera off in proportion to how deep the room is, then make the panel exactly
  // tall enough for what is drawn. Without this the front rows and the last ticket tiers get cut off.
  useEffect(() => {
    const vp = viewport.current
    const scene = vp?.querySelector<HTMLElement>('.seatmap-scene')
    if (!vp || !scene) return

    const fit = () => {
      const depth = scene.offsetHeight
      if (!depth) return
      const narrow = vp.clientWidth < 600
      // A narrow screen has no spare width, so it gets a flatter view (less stretch) and a slightly wider room.
      vp.style.setProperty('--wfrac', narrow ? '0.8' : '0.7')
      vp.style.setProperty('--persp', `${Math.round(depth * (narrow ? 4.6 : 3.1))}px`)
      const top = vp.getBoundingClientRect().top
      vp.style.height = `${Math.ceil(scene.getBoundingClientRect().bottom - top + 24)}px`
    }

    const observer = new ResizeObserver(fit)
    observer.observe(scene)
    observer.observe(vp)
    const later = window.setTimeout(fit, 900)
    fit()
    return () => {
      observer.disconnect()
      window.clearTimeout(later)
    }
  }, [zoom, blocks.length, pick?.seats])

  // Ctrl + wheel (and a trackpad pinch), two-finger pinch on a phone, and drag-to-pan with a mouse when zoomed in.
  useEffect(() => {
    const vp = viewport.current
    if (!vp) return
    const touches = new Map<number, { x: number; y: number }>()
    let pinchStart: { dist: number; zoom: number } | null = null
    let drag: { x: number; left: number } | null = null

    const spread = () => {
      const [a, b] = [...touches.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    // The scroll wheel zooms while the cursor is over the room. At the limits it lets the page scroll instead,
    // so scrolling down from the fitted view carries on down the page and you are never stuck inside the map.
    const wheel = (e: WheelEvent) => {
      const zoomingIn = e.deltaY < 0
      if (!e.ctrlKey && ((zoomingIn && zoomRef.current >= MAX_ZOOM) || (!zoomingIn && zoomRef.current <= MIN_ZOOM))) return
      e.preventDefault()
      applyZoom(zoomRef.current * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), { x: e.clientX, y: e.clientY })
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (touches.size === 2) pinchStart = { dist: spread(), zoom: zoomRef.current }
      } else if (e.button === 0 && zoomRef.current > 1 && !(e.target as HTMLElement).closest('.seat')) {
        drag = { x: e.clientX, left: vp.scrollLeft }
        vp.dataset.dragging = 'on'
      }
    }
    const move = (e: PointerEvent) => {
      if (touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (touches.size === 2 && pinchStart) applyZoom(pinchStart.zoom * (spread() / pinchStart.dist))
      } else if (drag) {
        vp.scrollLeft = drag.left - (e.clientX - drag.x)
      }
    }
    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId)
      if (touches.size < 2) pinchStart = null
      drag = null
      delete vp.dataset.dragging
    }

    vp.addEventListener('wheel', wheel, { passive: false })
    vp.addEventListener('pointerdown', down)
    vp.addEventListener('pointermove', move)
    vp.addEventListener('pointerup', up)
    vp.addEventListener('pointercancel', up)
    vp.addEventListener('pointerleave', up)
    return () => {
      vp.removeEventListener('wheel', wheel)
      vp.removeEventListener('pointerdown', down)
      vp.removeEventListener('pointermove', move)
      vp.removeEventListener('pointerup', up)
      vp.removeEventListener('pointercancel', up)
      vp.removeEventListener('pointerleave', up)
    }
  }, [applyZoom])

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
      <div className="seatmap-zoom" role="group" aria-label="Zoom the seat map">
        <button type="button" onClick={() => applyZoom(zoom / 1.3)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
          <MagnifyingGlassMinus size={18} weight="bold" aria-hidden="true" />
        </button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => applyZoom(zoom * 1.3)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
          <MagnifyingGlassPlus size={18} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => applyZoom(1)} disabled={zoom === 1} aria-label="Fit the whole room">
          <ArrowsIn size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="seatmap-viewport" ref={viewport} data-zoomed={zoom > 1 || undefined} style={{ ['--zoom' as string]: zoom }}>
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
                            >
                              <b className="seat-no" aria-hidden="true">
                                {picked ? s.label : s.number}
                              </b>
                            </span>
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
      </div>
      <div className="seatmap-light" aria-hidden="true" />
      <figcaption>
        {pick
          ? chosen
            ? `Seat ${chosen.label} is yours to book. Tap it again to change your mind.`
            : 'Pick any glowing seat. Dark seats are taken. Scroll the mouse wheel over the room to zoom.'
          : (caption ?? 'Live availability. Free seats glow; the organiser assigns your exact seat. Scroll to zoom.')}
      </figcaption>
    </figure>
  )
}
