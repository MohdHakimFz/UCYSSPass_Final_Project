import { useState } from 'react'
import { Tag } from '@carbon/react'
import { useFetch } from '@/lib/useFetch'
import type { SeatMap, SeatMapSeat } from '@/lib/api'
import { Skeleton } from '@/dashboard/ui'

const STATE_LABEL: Record<SeatMapSeat['state'], string> = { free: 'Free', held: 'Awaiting payment', booked: 'Booked', attended: 'Checked in' }
const STATE_TAG: Record<SeatMapSeat['state'], 'gray' | 'warm-gray' | 'blue' | 'green'> = { free: 'gray', held: 'warm-gray', booked: 'blue', attended: 'green' }

function rowsOf(seats: SeatMapSeat[]) {
  const rows = new Map<string, SeatMapSeat[]>()
  for (const seat of seats) rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat])
  return [...rows.entries()]
}

/** The room as the organiser sees it: every numbered seat, who holds it, and what state it is in. Refreshes on its own. */
export default function SeatMapPanel({ eventId }: { eventId: number }) {
  const { data, error } = useFetch<SeatMap>(`/events/${eventId}/seat-map`)
  const [picked, setPicked] = useState<number | null>(null)

  if (error) return <p className="sub">{error}</p>
  if (!data) return <Skeleton rows={4} />
  if (!data.seated) return <p className="sub">Numbered seats are off for this event. Turn them on in the event details to see the room here.</p>
  if (data.tiers.every((t) => t.seats.length === 0)) return <p className="sub">Add a ticket tier to lay out the seats.</p>

  const all = data.tiers.flatMap((t) => t.seats.map((seat) => ({ ...seat, tier: t.name })))
  const chosen = all.find((s) => s.id === picked) ?? null
  const count = (state: SeatMapSeat['state']) => all.filter((s) => s.state === state).length

  return (
    <div className="seatmap">
      <ul className="seatmap-legend" aria-label="Seat colours">
        {(['free', 'held', 'booked', 'attended'] as const).map((state) => (
          <li key={state}>
            <i className="seat-dot" data-state={state} />
            {STATE_LABEL[state]} <strong>{count(state)}</strong>
          </li>
        ))}
      </ul>

      <div className="seatmap-body">
        <div className="seatmap-tiers">
          <div className="seatmap-stage">Stage</div>
          {data.tiers
            .filter((t) => t.seats.length > 0)
            .map((tier) => {
              const taken = tier.seats.filter((s) => s.state !== 'free').length
              return (
                <section key={tier.id} className="seatmap-tier">
                  <h3>
                    {tier.name} <span className="sub">{taken} of {tier.seats.length} taken</span>
                  </h3>
                  {rowsOf(tier.seats).map(([row, seats]) => (
                    <div key={row} className="seat-row">
                      <span className="seat-row-label" aria-hidden="true">
                        {row}
                      </span>
                      {seats.map((seat) => (
                        <button
                          key={seat.id}
                          type="button"
                          className="seat"
                          data-state={seat.state}
                          data-picked={seat.id === picked}
                          aria-pressed={seat.id === picked}
                          aria-label={`Seat ${seat.label}, ${STATE_LABEL[seat.state].toLowerCase()}${seat.guest?.name ? `, ${seat.guest.name}` : ''}, ${tier.name}`}
                          onClick={() => setPicked(seat.id === picked ? null : seat.id)}
                        >
                          {seat.number}
                        </button>
                      ))}
                    </div>
                  ))}
                </section>
              )
            })}
        </div>

        <aside className="seatmap-detail" aria-live="polite">
          {chosen ? (
            <>
              <h3>
                Seat {chosen.label} <span className="sub">{chosen.tier}</span>
              </h3>
              <Tag type={STATE_TAG[chosen.state]} size="md">
                {STATE_LABEL[chosen.state]}
              </Tag>
              {chosen.guest ? (
                <dl>
                  <dt>Guest</dt>
                  <dd>{chosen.guest.name ?? 'Unknown'}</dd>
                  <dt>Email</dt>
                  <dd>{chosen.guest.email}</dd>
                  {chosen.guest.checked_in_at && (
                    <>
                      <dt>Checked in</dt>
                      <dd>{new Date(chosen.guest.checked_in_at).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <p className="sub">Nobody has this seat.</p>
              )}
            </>
          ) : (
            <p className="sub">Pick a seat to see who is sitting there.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
