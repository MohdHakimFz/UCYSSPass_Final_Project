import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiBlobUrl, errorText, type Booking, type Paginated } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { CATEGORY_LABEL, Notice, Skeleton, Tag, formatWhen } from '../components/ui'
import { downloadIcs } from '../lib/ics'

function QrImage({ bookingId }: { bookingId: number }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let url: string | null = null
    let live = true
    apiBlobUrl(`/bookings/${bookingId}/qr-code`)
      .then((u) => {
        url = u
        if (live) setSrc(u)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [bookingId])

  if (failed) return <p className="sub">Couldn&apos;t load the QR code. Close this and try again in a moment.</p>
  if (!src) return <div className="qr-loading" aria-label="Generating your QR code" />
  return <img className="qr-img" src={src} alt={`QR code for booking ${bookingId}`} width={260} height={260} />
}

// Showing a pass at the door needs focus and space, so it gets its own large view.
function PassDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const ev = booking.ticket_type?.event

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="pass-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      aria-label="Your QR pass"
    >
      <div className="pass-dialog-body">
        <h2>{ev?.title ?? 'Your pass'}</h2>
        <p className="sub">
          {booking.ticket_type?.name} pass{ev ? ` · ${formatWhen(ev.start_at)}` : ''}
        </p>
        <QrImage bookingId={booking.id} />
        <p className="sub">Turn your screen brightness up and hold it steady for the scanner.</p>
        <div className="ticket-actions">
          <button className="btn" onClick={() => ref.current?.close()}>
            Done
          </button>
          <button className="btn-quiet" onClick={() => downloadIcs(booking)}>
            Add to calendar
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default function Passes() {
  const { data, error, reload } = useFetch<Paginated<Booking>>('/bookings?per_page=50')
  const [shown, setShown] = useState<Booking | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  async function cancel(b: Booking) {
    if (!window.confirm(`Cancel your ${b.ticket_type?.name} pass? This can't be undone.`)) return
    setNote(null)
    try {
      await api(`/bookings/${b.id}/cancel`, { method: 'PUT' })
      setNote({ tone: 'ok', text: 'Booking cancelled.' })
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
        <Skeleton rows={3} />
      ) : data && data.data.length === 0 ? (
        <div className="empty">
          <p>You have no passes yet.</p>
          <Link className="btn" style={{ marginTop: 16 }} to="/events">
            Browse events
          </Link>
        </div>
      ) : (
        data && (
          <ul className="wallet">
            {data.data.map((b) => {
              const ev = b.ticket_type?.event
              const start = ev ? new Date(ev.start_at) : null
              const canShow = !!b.qr_token && (b.status === 'confirmed' || b.status === 'attended')
              const canCancel = b.status === 'pending' || b.status === 'confirmed' || b.status === 'waitlisted'
              return (
                <li key={b.id} className="ticket" data-status={b.status}>
                  <div className="ticket-main">
                    <h2>{ev?.title ?? 'Event'}</h2>
                    <p className="sub">{ev ? `${CATEGORY_LABEL[ev.category]} · ${ev.venue?.name ?? 'Venue to be announced'}` : ''}</p>
                    {ev && <p className="sub">{formatWhen(ev.start_at)}</p>}

                    {b.status === 'waitlisted' && (
                      <p className="ticket-note">
                        {b.waitlist_position ? `You're number ${b.waitlist_position} in the queue. ` : "You're on the waitlist. "}
                        You&apos;ll be confirmed and emailed if a seat opens.
                      </p>
                    )}
                    {b.status === 'attended' && b.checked_in_at && <p className="ticket-note">Checked in {formatWhen(b.checked_in_at)}.</p>}

                    {(canShow || canCancel) && (
                      <div className="ticket-actions">
                        {canShow && (
                          <button className="btn" onClick={() => setShown(b)}>
                            Show pass
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
                  </div>

                  <div className="ticket-stub">
                    {start && (
                      <>
                        <span className="stub-day">{start.getDate()}</span>
                        <span className="stub-month">{start.toLocaleString('en-MY', { month: 'short' })}</span>
                      </>
                    )}
                    <Tag status={b.status} />
                    <span className="sub">{b.ticket_type?.name}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )
      )}

      {shown && <PassDialog key={shown.id} booking={shown} onClose={() => setShown(null)} />}
    </>
  )
}
