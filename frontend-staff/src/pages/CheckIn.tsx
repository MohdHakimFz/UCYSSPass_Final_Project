import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { api, ApiError, errorText, type Booking } from '../lib/api'

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
