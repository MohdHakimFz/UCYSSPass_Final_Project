import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bank, CreditCard, Wallet, CheckCircle } from '@phosphor-icons/react'
import { api, errorText, ApiError, type Booking } from '@/lib/api'
import { Notice } from '@/customer/ui'

type Method = 'card' | 'fpx' | 'ewallet'
type Outcome = 'approve' | 'decline' | 'insufficient'

const METHODS: { id: Method; label: string; hint: string; icon: typeof CreditCard }[] = [
  { id: 'card', label: 'Card', hint: 'Test card, no real details', icon: CreditCard },
  { id: 'fpx', label: 'Online banking', hint: 'FPX, sandbox', icon: Bank },
  { id: 'ewallet', label: 'E-wallet', hint: 'Sandbox', icon: Wallet },
]

const money = (v: string | number) => `RM ${Number(v).toFixed(2)}`

/**
 * Pay for a held seat. The seat is kept for a few minutes, counted down here from the server's own clock.
 * It is a sandbox: no money moves, and the test result can be chosen to show a declined payment.
 */
export default function Checkout({
  booking,
  info,
  onClose,
  onFinished,
}: {
  booking: Booking
  /** What is being bought, for the heading and the price. */
  info: { title: string; tier: string; price: string }
  /** Closed without paying. The hold stays until it runs out, so the customer can come back from My passes. */
  onClose: () => void
  /** The booking changed (paid, released or expired): refresh whatever is showing it. */
  onFinished: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [left, setLeft] = useState(booking.hold_seconds_left ?? 0)
  const [method, setMethod] = useState<Method>('card')
  const [outcome, setOutcome] = useState<Outcome>('approve')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState<Booking | null>(null)
  const [gone, setGone] = useState<string | null>(null)

  const price = info.price

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  // Count down once a second; when it reaches zero the seat goes back on sale.
  useEffect(() => {
    if (paid || gone) return
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [paid, gone])

  useEffect(() => {
    if (left === 0 && !paid && !gone) {
      setGone('Your hold ran out and the seat is back on sale. Choose it again if it is still free.')
      onFinished()
    }
  }, [left, paid, gone, onFinished])

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      const result = await api<Booking>(`/bookings/${booking.id}/pay`, { method: 'POST', body: { method, outcome } })
      setPaid(result)
      onFinished()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setGone(err.message)
        onFinished()
      } else {
        setError(errorText(err))
      }
    } finally {
      setBusy(false)
    }
  }

  async function release() {
    setBusy(true)
    try {
      await api(`/bookings/${booking.id}/cancel`, { method: 'PUT' })
      onFinished()
      ref.current?.close()
    } catch (err) {
      setError(errorText(err))
      setBusy(false)
    }
  }

  const mm = String(Math.floor(left / 60))
  const ss = String(left % 60).padStart(2, '0')
  const total = booking.hold_seconds_left && booking.hold_seconds_left > 0 ? Math.max(booking.hold_seconds_left, left) : 180

  return (
    <dialog
      ref={ref}
      className="pass-dialog checkout"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      aria-label="Complete your booking"
    >
      <div className="pass-dialog-body">
        {paid ? (
          <>
            <CheckCircle size={48} weight="fill" className="checkout-ok" aria-hidden="true" />
            <h2>Paid. You are in.</h2>
            <p className="sub">
              {info.title}
              {paid.seat ? `, seat ${paid.seat.label}` : ''}
            </p>
            <dl className="receipt">
              <div>
                <dt>Amount</dt>
                <dd>{money(paid.payment?.amount ?? price)}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{METHODS.find((m) => m.id === paid.payment?.method)?.label ?? method}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{paid.payment?.reference ?? 'Sandbox'}</dd>
              </div>
            </dl>
            <div className="ticket-actions">
              <Link className="btn" to="/passes" onClick={() => ref.current?.close()}>
                View my pass
              </Link>
              <button className="btn-quiet" onClick={() => ref.current?.close()}>
                Close
              </button>
            </div>
          </>
        ) : gone ? (
          <>
            <h2>Hold ended</h2>
            <Notice tone="warn">{gone}</Notice>
            <div className="ticket-actions">
              <button className="btn" onClick={() => ref.current?.close()}>
                Choose again
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Complete your booking</h2>
            <p className="sub">
              {info.title}, {info.tier}
              {booking.seat ? `, seat ${booking.seat.label}` : ''}
            </p>

            <div className="hold" data-low={left <= 30 || undefined} role="timer" aria-label={`Seat held for ${mm} minutes ${ss} seconds`}>
              <div className="hold-time">
                <strong>
                  {mm}:{ss}
                </strong>
                <span>your seat is held</span>
              </div>
              <div className="hold-bar">
                <i style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
              </div>
            </div>

            {error && <Notice tone="error">{error}</Notice>}

            <fieldset className="methods">
              <legend>Pay with</legend>
              {METHODS.map(({ id, label, hint, icon: Icon }) => (
                <label key={id} className="method" data-on={method === id || undefined}>
                  <input type="radio" name="method" value={id} checked={method === id} onChange={() => setMethod(id)} />
                  <Icon size={24} weight="bold" aria-hidden="true" />
                  <span>
                    <strong>{label}</strong>
                    <em>{hint}</em>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="field sandbox">
              Sandbox test result
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
                <option value="approve">Payment succeeds</option>
                <option value="decline">Payment is declined</option>
                <option value="insufficient">Insufficient funds</option>
              </select>
            </label>
            <p className="sub">This is a sandbox. No real money or card details are used.</p>

            <div className="ticket-actions">
              <button className="btn btn-lg" onClick={pay} disabled={busy}>
                {busy ? 'Paying…' : `Pay ${money(price)}`}
              </button>
              <button className="btn-quiet" onClick={release} disabled={busy}>
                Release the seat
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}
