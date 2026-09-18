import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  api,
  downloadFile,
  errorText,
  type Booking,
  type Category,
  type EventItem,
  type EventStats,
  type EventStatus,
  type Paginated,
  type TicketType,
  type Venue,
} from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { CATEGORY_LABEL, Notice, Tag, formatWhen } from '../components/ui'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]
const STATUSES: EventStatus[] = ['draft', 'published', 'cancelled', 'completed']

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function EventEditor() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { data: event, error: loadError, reload } = useFetch<EventItem>(isNew ? null : `/events/${id}`)
  const { data: venues } = useFetch<Paginated<Venue>>('/venues?per_page=100')
  const { data: stats, reload: reloadStats } = useFetch<EventStats>(isNew ? null : `/events/${id}/stats`)
  const [actionNote, setActionNote] = useState<string | null>(null)

  const reloadAll = () => {
    reload()
    reloadStats()
  }

  async function duplicate() {
    setActionNote(null)
    try {
      const copy = await api<EventItem>(`/events/${id}/duplicate`, { method: 'POST' })
      navigate(`/events/${copy.id}`)
    } catch (err) {
      setActionNote(errorText(err))
    }
  }

  if (!isNew && !event && !loadError) return <p className="loading">Loading event…</p>
  if (loadError) return <Notice tone="error">{loadError}</Notice>

  return (
    <>
      <div className="page-head">
        <h1>{isNew ? 'Create event' : event!.title}</h1>
        {!isNew && <Tag status={event!.status} />}
      </div>

      {actionNote && <Notice tone="error">{actionNote}</Notice>}

      {!isNew && (
        <div className="form-actions" style={{ marginBottom: 24 }}>
          <button className="btn-quiet" onClick={duplicate}>
            Duplicate event
          </button>
          <button
            className="btn-quiet"
            onClick={() => downloadFile(`/events/${id}/export`, `attendees-event-${id}.csv`).catch((e) => setActionNote(errorText(e)))}
          >
            Export attendees (CSV)
          </button>
        </div>
      )}

      {stats && <StatsPanel stats={stats} />}

      <EventForm
        key={event?.id ?? 'new'}
        event={event}
        venues={venues?.data ?? []}
        onSaved={(saved) => (isNew ? navigate(`/events/${saved.id}`, { replace: true }) : reloadAll())}
      />

      {!isNew && event && (
        <>
          <section>
            <h2 className="section-title">Ticket tiers</h2>
            <p className="section-note">Each tier has its own price and seat count. When a tier sells out, new bookings join its waitlist.</p>
            <Tiers event={event} stats={stats} onChange={reloadAll} />
          </section>
          <section>
            <h2 className="section-title">Attendees</h2>
            <p className="section-note">Everyone booked on this event. People are checked in from the Check-in tab.</p>
            <Attendees eventId={event.id} />
          </section>
        </>
      )}
    </>
  )
}

function EventForm({
  event,
  venues,
  onSaved,
}: {
  event: EventItem | null
  venues: Venue[]
  onSaved: (e: EventItem) => void
}) {
  const [f, setF] = useState({
    title: event?.title ?? '',
    description: event?.description ?? '',
    category: (event?.category ?? 'ctf') as Category,
    venue_id: event ? String(event.venue_id) : '',
    start_at: event ? toLocalInput(event.start_at) : '',
    end_at: event ? toLocalInput(event.end_at) : '',
    status: (event?.status ?? 'draft') as EventStatus,
  })
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (event && f.status === 'cancelled' && event.status !== 'cancelled' && !window.confirm('Cancel this event? Every active booking is cancelled and those attendees are emailed.')) return
    setBusy(true)
    setNote(null)
    const body = {
      ...f,
      venue_id: Number(f.venue_id || venues[0]?.id),
      start_at: new Date(f.start_at).toISOString(),
      end_at: new Date(f.end_at).toISOString(),
      description: f.description || null,
    }
    try {
      const saved = event
        ? await api<EventItem & { cancelled_bookings?: number }>(`/events/${event.id}`, { method: 'PUT', body })
        : await api<EventItem & { cancelled_bookings?: number }>('/events', { method: 'POST', body })
      setNote({
        tone: 'ok',
        text: !event
          ? 'Event created. Add ticket tiers next.'
          : saved.cancelled_bookings
            ? `Event cancelled. ${saved.cancelled_bookings} bookings were cancelled and the attendees emailed.`
            : 'Event saved.',
      })
      onSaved(saved)
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel" onSubmit={save}>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <div className="form-grid">
        <label className="field">
          Title
          <input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </label>
        <label className="field">
          Category
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Venue
          <select required value={f.venue_id || String(venues[0]?.id ?? '')} onChange={(e) => setF({ ...f, venue_id: e.target.value })}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} (holds {v.capacity})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as EventStatus })}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Starts
          <input required type="datetime-local" value={f.start_at} onChange={(e) => setF({ ...f, start_at: e.target.value })} />
        </label>
        <label className="field">
          Ends
          <input required type="datetime-local" value={f.end_at} onChange={(e) => setF({ ...f, end_at: e.target.value })} />
        </label>
      </div>
      <label className="field" style={{ marginBottom: 20 }}>
        Description
        <textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </label>
      <div className="form-actions">
        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : event ? 'Save event' : 'Create event'}
        </button>
      </div>
    </form>
  )
}

type Tier = { id?: number; name: string; price: string; capacity: string }

function Tiers({ event, stats, onChange }: { event: EventItem; stats: EventStats | null; onChange: () => void }) {
  const waitByTier = new Map(stats?.tiers.map((t) => [t.id, t.waitlisted]))
  const tiers = event.ticket_types ?? []
  const [draft, setDraft] = useState<Tier | null>(null)
  const [note, setNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    setNote(null)
    const body = { name: draft.name, price: Number(draft.price), capacity: Number(draft.capacity) }
    try {
      if (draft.id) await api(`/ticket-types/${draft.id}`, { method: 'PUT', body })
      else await api(`/events/${event.id}/ticket-types`, { method: 'POST', body })
      setDraft(null)
      onChange()
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) })
    }
  }

  async function remove(t: TicketType) {
    if (!window.confirm(`Delete the ${t.name} tier? Bookings on it are deleted too.`)) return
    setNote(null)
    try {
      await api(`/ticket-types/${t.id}`, { method: 'DELETE' })
      onChange()
    } catch (err) {
      setNote({ tone: 'error', text: errorText(err) })
    }
  }

  return (
    <>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {tiers.length === 0 ? (
        <p className="empty">No tiers yet. Add one (for example Early bird, Standard or VIP) to open bookings.</p>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Price</th>
                <th>Seats left</th>
                <th>Waitlist</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name}</strong>
                  </td>
                  <td data-label="Price">RM {Number(t.price).toFixed(2)}</td>
                  <td data-label="Seats left">
                    {t.seats_remaining} of {t.capacity}
                  </td>
                  <td data-label="Waitlist">{waitByTier.get(t.id) ?? 0}</td>
                  <td className="actions">
                    <button
                      className="btn-quiet"
                      onClick={() => setDraft({ id: t.id, name: t.name, price: String(Number(t.price)), capacity: String(t.capacity) })}
                    >
                      Edit
                    </button>{' '}
                    <button className="btn-danger" onClick={() => remove(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft ? (
        <form className="panel" onSubmit={save} style={{ marginTop: 16 }}>
          <h2>{draft.id ? 'Edit tier' : 'Add tier'}</h2>
          <div className="form-grid">
            <label className="field">
              Name
              <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="field">
              Price (RM)
              <input required type="number" min={0} step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
            </label>
            <label className="field">
              Seats
              <input required type="number" min={0} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn">Save tier</button>
            <button type="button" className="btn-quiet" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p style={{ marginTop: 16 }}>
          <button className="btn-quiet" onClick={() => setDraft({ name: '', price: '0', capacity: '50' })}>
            Add tier
          </button>
        </p>
      )}
    </>
  )
}

function Attendees({ eventId }: { eventId: number }) {
  const { data, error } = useFetch<Paginated<Booking>>(`/bookings?event_id=${eventId}&per_page=50`)

  if (error) return <Notice tone="error">{error}</Notice>
  if (!data) return <p className="loading">Loading attendees…</p>
  if (data.data.length === 0) return <p className="empty">Nobody has booked yet.</p>

  return (
    <div className="ledger-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th>Attendee</th>
            <th>Tier</th>
            <th>Booked</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((b) => (
            <tr key={b.id}>
              <td>
                <strong>{b.customer?.name}</strong>
                <span className="sub">{b.customer?.email}</span>
              </td>
              <td data-label="Tier">{b.ticket_type?.name}</td>
              <td data-label="Booked">{formatWhen(b.booked_at)}</td>
              <td data-label="Status">
                <Tag status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatsPanel({ stats }: { stats: EventStats }) {
  const pct = (n: number) => (stats.capacity ? (n / stats.capacity) * 100 : 0)
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 className="section-title">How it&apos;s going</h2>
      <p className="lede-sub" style={{ marginTop: 0, marginBottom: 16 }}>
        {stats.held} of {stats.capacity} seats are held ({stats.fill_rate}%). {stats.attended} of {stats.held} guests have checked in (
        {stats.check_in_rate}%).{' '}
        {stats.waitlisted > 0 ? `${stats.waitlisted} ${stats.waitlisted === 1 ? 'person is' : 'people are'} waiting for a seat. ` : ''}
        {stats.event_ended ? `${stats.no_show} confirmed guests never showed up.` : ''}
      </p>
      <div className="bar" role="img" aria-label={`${stats.attended} checked in, ${stats.confirmed} confirmed, ${stats.seats_remaining} open`}>
        <i className="b-attended" style={{ width: `${pct(stats.attended)}%` }} />
        <i className="b-confirmed" style={{ width: `${pct(stats.confirmed)}%` }} />
      </div>
      <div className="key">
        <span style={{ ['--sw' as string]: 'var(--ink)' }}>Checked in</span>
        <span style={{ ['--sw' as string]: 'var(--cleared)' }}>Confirmed, not yet arrived</span>
        <span style={{ ['--sw' as string]: '#d2d9df' }}>Open seat</span>
      </div>
    </section>
  )
}
