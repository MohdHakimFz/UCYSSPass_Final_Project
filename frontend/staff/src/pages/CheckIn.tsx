import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api, ApiError, errorText, type Booking, type EventItem, type EventStats, type Paginated } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import { formatWhen } from '../components/ui'

type Outcome =
  | { kind: 'ok'; booking: Booking }
  | { kind: 'fail'; title: string; detail: string }

// The QR encodes {"booking_id": n, "qr_token": "..."} — accept that JSON or a pasted "id token" pair.
function parsePass(raw: string): { id: number; token: string } | null {
  try {
    const j = JSON.parse(raw)
    if (j.booking_id && j.qr_token) return { id: Number(j.booking_id), token: String(j.qr_token) }
  } catch {
    /* fall through to plain-text formats */
  }
  const m = raw.trim().match(/^(\d+)[\s:,|]+([a-f0-9]{64})$/i)
  return m ? { id: Number(m[1]), token: m[2] } : null
}

export default function CheckIn() {
  const [scanning, setScanning] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState(false)
  const handling = useRef(false)

  const { user } = useAuth()
  const mine = user?.role === 'organiser' ? `&organiser_id=${user.id}` : ''
  const { data: events } = useFetch<Paginated<EventItem>>(`/events?status=published&per_page=50&sort=start_at${mine}`)
  const [chosen, setChosen] = useState('')
  const eventId = chosen || (events?.data[0] ? String(events.data[0].id) : '')
  const { data: stats, reload } = useFetch<EventStats>(eventId ? `/events/${eventId}/stats` : null)

  // Keep the door count fresh while other staff are also scanning.
  const reloadRef = useRef(reload)
  useEffect(() => {
    reloadRef.current = reload
  })
  useEffect(() => {
    const t = setInterval(() => reloadRef.current(), 10000)
    return () => clearInterval(t)
  }, [])

  async function submit(raw: string) {
    if (handling.current) return
    handling.current = true
    setBusy(true)
    setOutcome(null)

    const pass = parsePass(raw)
    if (!pass) {
      setOutcome({ kind: 'fail', title: 'Not a SentryPass ticket', detail: "That code doesn't contain a booking and signature." })
    } else {
      try {
        const booking = await api<Booking>(`/bookings/${pass.id}/checkin`, { method: 'POST', body: { qr_token: pass.token } })
        setOutcome({ kind: 'ok', booking })
        reloadRef.current()
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0
        setOutcome({
          kind: 'fail',
          title:
            status === 422
              ? 'Forged or altered ticket'
              : status === 409
                ? 'Already used, or not confirmed'
                : status === 403
                  ? 'Not your event'
                  : 'Check-in failed',
          detail: errorText(err),
        })
      }
    }
    setBusy(false)
    handling.current = false
  }

  useEffect(() => {
    if (!scanning) return
    const scanner = new Html5Qrcode('reader')
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          setScanning(false)
          void submit(text)
        },
        () => undefined,
      )
      .catch(() => {
        setCamError("Couldn't open the camera. Allow camera access, or paste the ticket below.")
        setScanning(false)
      })
    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => undefined)
    }
  }, [scanning])

  return (
    <>
      <div className="page-head">
        <h1>Check-in</h1>
      </div>

      <section style={{ marginBottom: 40 }}>
        <label className="field" style={{ maxWidth: 420, marginBottom: 20 }}>
          Checking in guests for
          <select value={eventId} onChange={(e) => setChosen(e.target.value)}>
            {events?.data.length === 0 && <option value="">No published events</option>}
            {events?.data.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </label>
        {stats && (
          <>
            <h2 className="wide" style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>
              {stats.attended} / {stats.held} checked in
            </h2>
            <p className="section-note" style={{ marginTop: 8 }}>
              {stats.held - stats.attended} guests still to arrive
              {stats.waitlisted > 0 ? `, ${stats.waitlisted} on the waitlist` : ''}.
            </p>
            <div className="bar" role="img" aria-label={`${stats.attended} of ${stats.held} checked in`}>
              <i className="b-attended" style={{ width: `${stats.held ? (stats.attended / stats.held) * 100 : 0}%` }} />
            </div>
            {stats.recent_checkins.length > 0 && (
              <ul className="tally" style={{ marginTop: 20 }}>
                {stats.recent_checkins.slice(0, 5).map((c) => (
                  <li key={c.booking_id}>
                    <span>
                      {c.name} <span className="sub" style={{ display: 'inline' }}>· {c.tier}</span>
                    </span>
                    <span className="sub" style={{ display: 'inline' }}>
                      {formatWhen(c.checked_in_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <div className="split">
        <section>
          <h2 className="section-title">Scan a pass</h2>
          <p className="section-note">Point the camera at the QR code on the attendee&apos;s ticket.</p>
          <div id="reader" className="reader" hidden={!scanning} />
          {!scanning && (
            <button
              className="btn"
              onClick={() => {
                setCamError(null)
                setOutcome(null)
                setScanning(true)
              }}
            >
              Start scanning
            </button>
          )}
          {scanning && (
            <button className="btn-quiet" style={{ marginTop: 12 }} onClick={() => setScanning(false)}>
              Stop
            </button>
          )}
          {camError && <p className="notice" data-tone="warn" style={{ marginTop: 16 }}>{camError}</p>}
        </section>

        <section>
          <h2 className="section-title">Enter a ticket</h2>
          <p className="section-note">No camera? Paste the ticket text: the booking number and signature.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submit(manual)
            }}
          >
            <label className="field" style={{ marginBottom: 12 }}>
              Ticket
              <textarea rows={3} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="31 7f14877428db33fd…" />
            </label>
            <button className="btn-quiet" disabled={busy || !manual.trim()}>
              Check in
            </button>
          </form>
        </section>
      </div>

      {outcome && (
        <div className="result" data-ok={outcome.kind === 'ok'} role="status" aria-live="polite">
          {outcome.kind === 'ok' ? (
            <>
              <h2>Cleared to enter</h2>
              <p>
                Booking #{outcome.booking.id}
                {outcome.booking.ticket_type?.event ? ` for ${outcome.booking.ticket_type.event.title}` : ''} is now checked in.
              </p>
              {eventId && outcome.booking.ticket_type?.event && String(outcome.booking.ticket_type.event.id) !== eventId && (
                <p style={{ marginTop: 8, fontWeight: 600 }}>Heads up: this ticket is for a different event from the one selected above.</p>
              )}
            </>
          ) : (
            <>
              <h2>{outcome.title}</h2>
              <p>{outcome.detail}</p>
            </>
          )}
        </div>
      )}
    </>
  )
}
