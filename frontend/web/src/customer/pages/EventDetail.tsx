import { useEffect, useState } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, errorText, type Booking, type EventItem, type SeatInfo, type TicketType } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import SeatMap from '@/customer/fx/SeatMap'
import Checkout from '@/customer/Checkout'
import { useFetch, useLiveTick } from '@/lib/useFetch'
import { CATEGORY_LABEL, Notice, formatWhen, Skeleton } from '@/customer/ui'

export default function EventDetail() {
  const { id } = useParams()
  const { user, loading: sessionLoading } = useAuth()
  const navigate = useNavigate()
  const { data: event, error, reload } = useFetch<EventItem>(`/events/${id}`)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [seats, setSeats] = useState<Record<string, SeatInfo[]>>({})
  const [seatPick, setSeatPick] = useState<{ tierId: number; seat: SeatInfo } | null>(null)
  const [seatsKey, setSeatsKey] = useState(0)
  const live = useLiveTick()
  const [checkout, setCheckout] = useState<{ booking: Booking; tier: TicketType } | null>(null)

  // Numbered seats: load every tier's seats (free or taken) so the room shows the real thing.
  const seated = !!event?.seated
  const tierIds = (event?.ticket_types ?? []).map((t) => t.id).join(',')
  useEffect(() => {
    if (!seated || !tierIds) return
    let live = true
    Promise.all(tierIds.split(',').map((id) => api<SeatInfo[]>(`/ticket-types/${id}/seats`).then((rows) => [id, rows] as const)))
      .then((pairs) => live && setSeats(Object.fromEntries(pairs)))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [seated, tierIds, seatsKey, live])
  const [note, setNote] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null)

  // Someone else took the seat while it was picked: let go of it and say so.
  useEffect(() => {
    if (!seatPick) return
    const fresh = seats[String(seatPick.tierId)]?.find((s) => s.id === seatPick.seat.id)
    if (fresh?.taken) {
      setSeatPick(null)
      setNote({ tone: 'warn', text: `Seat ${seatPick.seat.label} was just taken. Pick another one.` })
    }
  }, [seats, seatPick])

  async function book(t: TicketType) {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/events/${id}`)}`)
      return
    }
    setBusyId(t.id)
    setNote(null)
    try {
      const wantsSeat = seated && seatPick?.tierId === t.id && t.seats_remaining > 0
      const b = await api<Booking>('/bookings', { method: 'POST', body: { ticket_type_id: t.id, ...(wantsSeat ? { seat_id: seatPick!.seat.id } : {}) } })
      setSeatPick(null)
      setSeatsKey((k) => k + 1)
      if (b.status === 'pending') {
        setCheckout({ booking: b, tier: t })
        reload()
        return
      }
      setNote(
        b.status === 'confirmed'
          ? { tone: 'ok', text: b.seat ? `You're in. Seat ${b.seat.label} is yours, and the pass is waiting in My passes.` : `You're in. Your ${t.name} pass is confirmed and waiting in My passes.` }
          : { tone: 'warn', text: `${t.name} is sold out, so you're on the waitlist. If a seat opens you'll be confirmed automatically and emailed.` },
      )
      reload()
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      if (status === 409 || status === 422) {
        // Someone else may have taken the seat: show the room as it is now and let the person choose again.
        setSeatPick(null)
        setSeatsKey((k) => k + 1)
      }
      setNote({
        tone: 'error',
        text:
          status === 429
            ? 'Too many booking attempts. Wait a minute and try again.'
            : status === 403
              ? 'Only customer accounts can book seats.'
              : errorText(err),
      })
    } finally {
      setBusyId(null)
    }
  }

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: event?.title, url })
      else {
        await navigator.clipboard.writeText(url)
        setNote({ tone: 'ok', text: 'Link copied. Paste it anywhere to share this event.' })
      }
    } catch {
      /* the person closed the share sheet */
    }
  }

  if (error) return <Notice tone="error">{error}</Notice>
  if (!event) return <Skeleton rows={3} />

  const bookable = event.status === 'published'

  return (
    <>
      <p className="crumb">
        <Link to="/events" className="crumb-link">
          <CaretLeft size={16} weight="bold" aria-hidden="true" />
          All events
        </Link>
      </p>
      <div className="detail-poster">
        <div className="detail-date" data-cat={event.category}>
          <div className="poster-art" aria-hidden="true" />
          <div className="poster-date">
            <span className="poster-day">{new Date(event.start_at).getDate()}</span>
            <span className="poster-month">{new Date(event.start_at).toLocaleString('en-MY', { month: 'short' })}</span>
          </div>
        </div>
        <div className="detail-info">
          <h1>{event.title}</h1>
          <p className="detail-meta">
            {event.mode === 'online' ? `${CATEGORY_LABEL[event.category]}, online meeting` : `${CATEGORY_LABEL[event.category]} at ${event.venue?.name ?? 'a venue to be announced'}`}
            {event.mode === 'online' && (
              <>
                <br />
                <span className="online-note">The meeting link appears on your pass once your ticket is confirmed.</span>
              </>
            )}
            <br />
            {formatWhen(event.start_at)}
          </p>
          <div>
            <button className="btn-quiet" onClick={share}>
              Share this event
            </button>
          </div>
        </div>
      </div>

      {event.description && <p className="prose">{event.description}</p>}

      {checkout && (
        <Checkout
          key={checkout.booking.id}
          booking={checkout.booking}
          info={{ title: event.title, tier: checkout.tier.name, price: checkout.tier.price }}
          onClose={() => setCheckout(null)}
          onFinished={() => {
            setSeatsKey((k) => k + 1)
            reload()
          }}
        />
      )}

      <section>
        <h2 className="section-title">Choose your pass</h2>
        <p className="section-note">Sold-out tiers open a waitlist. You&apos;re confirmed automatically if a seat frees up. Free cancellation until 24 hours before the event; after that tickets are not refundable.</p>

        {note && <Notice tone={note.tone}>{note.text}</Notice>}
        {!bookable && <Notice tone="warn">This event is {event.status}, so booking is closed.</Notice>}

        {(event.ticket_types ?? []).length === 0 ? (
          <p className="empty">Tickets for this event aren&apos;t on sale yet.</p>
        ) : (
          <>
            <div className="detail-seatmap">
              <SeatMap
                blocks={event.ticket_types!.map((t) => ({ id: t.id, name: t.name, capacity: t.capacity, remaining: t.seats_remaining }))}
                selectedId={picked ?? event.ticket_types![0].id}
                onSelect={(id) => setPicked(Number(id))}
                pick={
                  seated && Object.keys(seats).length
                    ? {
                        seats,
                        value: seatPick ? { tierId: seatPick.tierId, seatId: seatPick.seat.id } : null,
                        onPick: (tierId, seat) => {
                          setSeatPick(seat ? { tierId: Number(tierId), seat } : null)
                          if (seat) setPicked(Number(tierId))
                        },
                      }
                    : undefined
                }
              />
            </div>
          <ul className="tiers">
            {event.ticket_types!.map((t) => (
              <li key={t.id} data-active={(picked ?? event.ticket_types![0].id) === t.id || undefined}>
                <div>
                  <h3>{t.name}</h3>
                  <p className="sub">
                    {t.seats_remaining > 0 ? `${t.seats_remaining} of ${t.capacity} seats left` : 'Sold out'}
                  </p>
                </div>
                <strong className="price">{Number(t.price) === 0 ? 'Free' : `RM ${Number(t.price).toFixed(2)}`}</strong>
                <button
                  className="btn"
                  disabled={!bookable || sessionLoading || busyId === t.id || (seated && t.seats_remaining > 0 && seatPick?.tierId !== t.id)}
                  onClick={() => book(t)}
                >
                  {busyId === t.id
                    ? 'Booking…'
                    : t.seats_remaining === 0
                      ? 'Join waitlist'
                      : seated
                        ? seatPick?.tierId === t.id
                          ? `Book seat ${seatPick.seat.label}`
                          : 'Choose a seat above'
                        : 'Book this pass'}
                </button>
              </li>
            ))}
          </ul>
          </>
        )}
      </section>
    </>
  )
}
