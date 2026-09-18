import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiBlobUrl, errorText, type Booking, type Paginated } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { CATEGORY_LABEL, Notice, Tag, formatWhen } from '../components/ui'
import { downloadIcs } from '../lib/ics'

function QrPass({ booking }: { booking: Booking }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let url: string | null = null
    let live = true
    apiBlobUrl(`/bookings/${booking.id}/qr-code`)
      .then((u) => {
        url = u
        if (live) setSrc(u)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [booking.id])

  if (failed) return <p className="sub">Couldn&apos;t load the QR code. Try again in a moment.</p>
  if (!src) return <p className="sub">Generating your QR code…</p>

  return (
    <div className="qr">
      <img src={src} alt={`QR code for booking ${booking.id}`} width={220} height={220} />
      <p className="sub">Show this at the door. It&apos;s signed, so a screenshot edit won&apos;t scan.</p>
    </div>
  )
}

export default function Passes() {
  const { data, error, reload } = useFetch<Paginated<Booking>>('/bookings?per_page=50')
  const [open, setOpen] = useState<number | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  async function cancel(b: Booking) {
    if (!window.confirm(`Cancel your ${b.ticket_type?.name} pass? This can't be undone.`)) return
    setNote(null)
    try {
      await api(`/bookings/${b.id}/cancel`, { method: 'PUT' })
      setNote({ tone: 'ok', text: 'Booking cancelled.' })
      setOpen(null)
      reload()
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) })
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>My passes</h1>
      </div>

      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {!data && !error ? (
        <p className="loading">Loading your passes…</p>
      ) : data && data.data.length === 0 ? (
        <p className="empty">
          No passes yet. <Link to="/">Browse events</Link> and book your first seat.
        </p>
      ) : (
        data && (
          <ul className="wallet">
            {data.data.map((b) => {
              const ev = b.ticket_type?.event
              const canShow = !!b.qr_token && (b.status === 'confirmed' || b.status === 'attended')
              const canCancel = b.status === 'pending' || b.status === 'confirmed' || b.status === 'waitlisted'
              return (
                <li key={b.id} className="ticket" data-status={b.status}>
                  <div className="ticket-top">
                    <div>
                      <h2>{ev?.title ?? 'Event'}</h2>
                      <p className="sub">
                        {ev ? `${CATEGORY_LABEL[ev.category]} · ${ev.venue?.name ?? 'Venue to be announced'}` : ''}
                      </p>
                      {ev && <p className="sub">{formatWhen(ev.start_at)}</p>}
                    </div>
                    <div className="ticket-status">
                      <Tag status={b.status} />
                      <span className="sub">{b.ticket_type?.name}</span>
                    </div>
                  </div>

                  {b.status === 'waitlisted' && (
                    <p className="sub">
                      {b.waitlist_position
                        ? `You're number ${b.waitlist_position} in the queue. `
                        : "You're on the waitlist. "}
                      You&apos;ll be confirmed and emailed if a seat opens.
                    </p>
                  )}
                  {b.status === 'attended' && b.checked_in_at && <p className="sub">Checked in {formatWhen(b.checked_in_at)}.</p>}

                  {open === b.id && canShow && <QrPass booking={b} />}

                  {(canShow || canCancel) && (
                    <div className="ticket-actions">
                      {canShow && (
                        <button className="btn" onClick={() => setOpen(open === b.id ? null : b.id)}>
                          {open === b.id ? 'Hide pass' : 'Show pass'}
                        </button>
                      )}
                      {canShow && (
                        <button className="btn-quiet" onClick={() => downloadIcs(b)}>
                          Add to calendar
                        </button>
                      )}
                      {canCancel && (
                        <button className="btn-danger" onClick={() => cancel(b)}>
                          Cancel booking
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )
      )}
    </>
  )
}
