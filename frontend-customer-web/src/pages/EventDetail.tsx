import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, errorText, type Booking, type EventItem, type TicketType } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import { CATEGORY_LABEL, Notice, formatWhen } from '../components/ui'

export default function EventDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: event, error, reload } = useFetch<EventItem>(`/events/${id}`)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null)

  async function book(t: TicketType) {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/events/${id}`)}`)
      return
    }
    setBusyId(t.id)
    setNote(null)
    try {
      const b = await api<Booking>('/bookings', { method: 'POST', body: { ticket_type_id: t.id } })
      setNote(
        b.status === 'confirmed'
          ? { tone: 'ok', text: `You're in. Your ${t.name} pass is confirmed and waiting in My passes.` }
          : { tone: 'warn', text: `${t.name} is sold out, so you're on the waitlist. If a seat opens you'll be confirmed automatically and emailed.` },
      )
      reload()
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
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
  if (!event) return <p className="loading">Loading event…</p>

  const bookable = event.status === 'published'

  return (
    <>
      <p className="crumb">
        <Link to="/">← All events</Link>
      </p>
      <section className="detail-head">
        <p className="kicker">{CATEGORY_LABEL[event.category]}</p>
        <h1>{event.title}</h1>
        <p className="lede-sub">
          {formatWhen(event.start_at)} · {event.venue?.name ?? 'Venue to be announced'}
        </p>
        <p style={{ marginTop: 16 }}>
          <button className="btn-quiet" onClick={share}>
            Share this event
          </button>
        </p>
      </section>

      {event.description && <p className="prose">{event.description}</p>}

      <section>
        <h2 className="section-title">Choose your pass</h2>
        <p className="section-note">Sold-out tiers open a waitlist. You&apos;re confirmed automatically if a seat frees up.</p>

        {note && <Notice tone={note.tone}>{note.text}</Notice>}
        {!bookable && <Notice tone="warn">This event is {event.status}, so booking is closed.</Notice>}

        {(event.ticket_types ?? []).length === 0 ? (
          <p className="empty">Tickets for this event aren&apos;t on sale yet.</p>
        ) : (
          <ul className="tiers">
            {event.ticket_types!.map((t) => (
              <li key={t.id}>
                <div>
                  <h3>{t.name}</h3>
                  <p className="sub">
                    {t.seats_remaining > 0 ? `${t.seats_remaining} of ${t.capacity} seats left` : 'Sold out'}
                  </p>
                </div>
                <strong className="price">{Number(t.price) === 0 ? 'Free' : `RM ${Number(t.price).toFixed(2)}`}</strong>
                <button className="btn" disabled={!bookable || busyId === t.id} onClick={() => book(t)}>
                  {busyId === t.id ? 'Booking…' : t.seats_remaining > 0 ? 'Book this pass' : 'Join waitlist'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
