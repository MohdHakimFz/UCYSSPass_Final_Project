import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiBlobUrl, downloadFile, errorText, type Booking, type Paginated } from '@/lib/api'
import { useFetch } from '@/lib/useFetch'
import Tilt from '@/shared/Tilt'
import Checkout from '@/customer/Checkout'
import { CATEGORY_LABEL, Notice, Skeleton, Tag, formatWhen } from '@/customer/ui'
import { downloadIcs } from '@/lib/ics'
import { joinLabel } from '@/lib/meeting'

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
        {booking.seat && <p className="pass-seat">Seat {booking.seat.label}</p>}
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

/** Opens the online meeting: the server only hands over the link once the meeting is open, and counts the click as attending. */
function JoinButton({ booking, onDone, onError }: { booking: Booking; onDone: () => void; onError: (text: string) => void }) {
  const [busy, setBusy] = useState(false)
  const m = booking.meeting
  if (!m) return null

  async function join() {
    // The tab has to open during the click, or the browser blocks it; the link is filled in when it arrives.
    const tab = window.open('about:blank', '_blank')
    setBusy(true)
    try {
      const res = await api<{ meeting_url: string }>(`/bookings/${booking.id}/join`, { method: 'POST' })
      if (tab) tab.location.href = res.meeting_url
      else window.location.assign(res.meeting_url)
      onDone()
    } catch (err) {
      tab?.close()
      onError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return m.open ? (
    <button className="btn" disabled={busy} onClick={join}>
      {busy ? 'Opening…' : joinLabel(m.platform)}
    </button>
  ) : (
    <button className="btn" disabled title={`The meeting opens at ${formatWhen(m.opens_at)}`}>
      Opens {formatWhen(m.opens_at)}
    </button>
  )
}

export default function Passes() {
  const { data, error, reload } = useFetch<Paginated<Booking>>('/bookings?per_page=50')
  const [shown, setShown] = useState<Booking | null>(null)
  const [paying, setPaying] = useState<Booking | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  async function cancel(b: Booking) {
    const ev = b.ticket_type?.event
    const paidAmount = b.payment?.status === 'paid' ? Number(b.payment.amount) : 0
    const early = ev ? new Date(ev.start_at).getTime() - Date.now() > 24 * 3600 * 1000 : false
    const money = paidAmount ? (early ? ` You will be refunded RM ${paidAmount.toFixed(2)}.` : ' It is less than 24 hours away, so it will not be refunded.') : ''
    if (!window.confirm(`Cancel your ${b.ticket_type?.name} pass?${money} This can't be undone.`)) return
    setNote(null)
    try {
      const res = await api<Booking>(`/bookings/${b.id}/cancel`, { method: 'PUT' })
      setNote({
        tone: 'ok',
        text: res.refund?.refunded ? `Booking cancelled. RM ${Number(res.refund.amount).toFixed(2)} has been refunded.` : 'Booking cancelled.',
      })
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
              const online = ev?.mode === 'online'
              const canShow = !!b.qr_token && (b.status === 'confirmed' || b.status === 'attended')
              const canCancel = b.status === 'pending' || b.status === 'confirmed' || b.status === 'waitlisted'
              const holding = b.status === 'pending' && !!b.hold_expires_at
              return (
                <Tilt as="li" key={b.id} className="ticket" data-status={b.status} max={7}>
                  <div className="ticket-main">
                    <h2>{ev?.title ?? 'Event'}</h2>
                    <p className="sub">{ev ? `${CATEGORY_LABEL[ev.category]} · ${ev.mode === 'online' ? 'Online meeting' : (ev.venue?.name ?? 'Venue to be announced')}` : ''}</p>
                    {ev && <p className="sub">{formatWhen(ev.start_at)}</p>}
                    {b.seat && <p className="seat-badge">Seat {b.seat.label}</p>}

                    {b.status === 'waitlisted' && (
                      <p className="ticket-note">
                        {b.waitlist_position ? `You're number ${b.waitlist_position} in the queue. ` : "You're on the waitlist. "}
                        You&apos;ll be confirmed and emailed if a seat opens.
                      </p>
                    )}
                    {holding && <p className="ticket-note">Awaiting payment. Your seat is held for a few minutes.</p>}
                    {b.payment?.status === 'paid' && <p className="sub">Paid RM {Number(b.payment.amount).toFixed(2)}</p>}
                    {b.payment?.status === 'refunded' && <p className="sub">Refunded RM {Number(b.payment.refunded_amount).toFixed(2)}</p>}
                    {b.status === 'attended' && b.checked_in_at && <p className="ticket-note">Checked in {formatWhen(b.checked_in_at)}.</p>}
                    {b.status === 'attended' && !b.certificate_ready && b.ticket_type?.event?.end_at && <p className="ticket-note">Your certificate is ready once the event ends ({formatWhen(b.ticket_type.event.end_at)}).</p>}

                    {online && b.meeting && <p className="ticket-note">{b.meeting.open ? 'The meeting is open. Join from here.' : `The link opens ${formatWhen(b.meeting.opens_at)}.`}</p>}

                    {(canShow || canCancel || b.certificate_ready) && (
                      <div className="ticket-actions">
                        {holding && (
                          <button className="btn" onClick={() => setPaying(b)}>
                            Pay now
                          </button>
                        )}
                        {online && b.meeting && <JoinButton booking={b} onDone={reload} onError={(text) => setNote({ tone: 'error', text })} />}
                        {canShow && !online && (
                          <button className="btn" onClick={() => setShown(b)}>
                            Show pass
                          </button>
                        )}
                        {b.certificate_ready && (
                          <button className="btn" onClick={() => downloadFile(`/bookings/${b.id}/certificate`, `ucyss-certificate-${b.id}.pdf`).catch((err) => setNote({ tone: 'error', text: errorText(err) }))}>
                            Download certificate
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
                </Tilt>
              )
            })}
          </ul>
        )
      )}

      {shown && <PassDialog key={shown.id} booking={shown} onClose={() => setShown(null)} />}
      {paying && (
        <Checkout
          key={paying.id}
          booking={paying}
          info={{ title: paying.ticket_type?.event?.title ?? 'Your booking', tier: paying.ticket_type?.name ?? '', price: paying.ticket_type?.price ?? '0' }}
          onClose={() => setPaying(null)}
          onFinished={reload}
        />
      )}
    </>
  )
}
