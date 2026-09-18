import { useState } from 'react'
import { Button, ProgressBar, Select, SelectItem, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TextArea, TextInput } from '@carbon/react'
import { Add, Copy, Download } from '@carbon/icons-react'
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
} from '@/lib/api'
import { useFetch } from '@/lib/useFetch'
import { CATEGORY_LABEL, Notice, StatusTag, formatWhen, Skeleton } from '@/dashboard/ui'

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
      navigate(`/organiser/events/${copy.id}`)
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
        {!isNew && <StatusTag status={event!.status} />}
      </div>

      {actionNote && <Notice tone="error">{actionNote}</Notice>}

      {!isNew && (
        <div className="form-actions" style={{ marginBottom: 24 }}>
          <Button kind="tertiary" size="md" renderIcon={Copy} onClick={duplicate}>
            Duplicate event
          </Button>
          <Button
            kind="tertiary"
            size="md"
            renderIcon={Download}
            onClick={() => downloadFile(`/events/${id}/export`, `attendees-event-${id}.csv`).catch((e) => setActionNote(errorText(e)))}
          >
            Export attendees (CSV)
          </Button>
        </div>
      )}

      {stats && <StatsPanel stats={stats} />}

      <EventForm
        key={event?.id ?? 'new'}
        event={event}
        venues={venues?.data ?? []}
        onSaved={(saved) => (isNew ? navigate(`/organiser/events/${saved.id}`, { replace: true }) : reloadAll())}
      />

      {!isNew && event && (
        <>
          <section className="section">
            <h2>Ticket tiers</h2>
            <p className="note">Each tier has its own price and seat count. When a tier sells out, new bookings join its waitlist.</p>
            <Tiers event={event} stats={stats} onChange={reloadAll} />
          </section>
          <section className="section">
            <h2>Attendees</h2>
            <p className="note">Everyone booked on this event. People are checked in from the Check-in tab.</p>
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
    <form className="pane" onSubmit={save} style={{ marginTop: 24 }}>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <div className="form-grid" style={{ marginTop: note ? 16 : 0 }}>
        <TextInput id="title" labelText="Title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Select id="category" labelText="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c} text={CATEGORY_LABEL[c]} />
          ))}
        </Select>
        <Select id="venue" labelText="Venue" required value={f.venue_id || String(venues[0]?.id ?? '')} onChange={(e) => setF({ ...f, venue_id: e.target.value })}>
          {venues.map((v) => (
            <SelectItem key={v.id} value={String(v.id)} text={`${v.name} (holds ${v.capacity})`} />
          ))}
        </Select>
        <Select id="status" labelText="Status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as EventStatus })}>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} text={s[0].toUpperCase() + s.slice(1)} />
          ))}
        </Select>
        <TextInput id="start" labelText="Starts" required type="datetime-local" value={f.start_at} onChange={(e) => setF({ ...f, start_at: e.target.value })} />
        <TextInput id="end" labelText="Ends" required type="datetime-local" value={f.end_at} onChange={(e) => setF({ ...f, end_at: e.target.value })} />
      </div>
      <TextArea id="description" labelText="Description" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} style={{ marginBottom: 24 }} />
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : event ? 'Save event' : 'Create event'}
        </Button>
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
        <Table aria-label="Ticket tiers">
          <TableHead>
            <TableRow>
              <TableHeader>Tier</TableHeader>
              <TableHeader>Price</TableHeader>
              <TableHeader>Seats left</TableHeader>
              <TableHeader>Waitlist</TableHeader>
              <TableHeader />
            </TableRow>
          </TableHead>
          <TableBody>
            {tiers.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <strong>{t.name}</strong>
                </TableCell>
                <TableCell>RM {Number(t.price).toFixed(2)}</TableCell>
                <TableCell>
                  {t.seats_remaining} of {t.capacity}
                </TableCell>
                <TableCell>{waitByTier.get(t.id) ?? 0}</TableCell>
                <TableCell>
                  <div className="form-actions">
                    <Button kind="ghost" size="sm" onClick={() => setDraft({ id: t.id, name: t.name, price: String(Number(t.price)), capacity: String(t.capacity) })}>
                      Edit
                    </Button>
                    <Button kind="danger--ghost" size="sm" onClick={() => remove(t)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {draft ? (
        <form className="pane" onSubmit={save} style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>{draft.id ? 'Edit tier' : 'Add tier'}</h3>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <TextInput id="tier-name" labelText="Name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <TextInput id="tier-price" labelText="Price (RM)" required type="number" min={0} step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
            <TextInput id="tier-seats" labelText="Seats" required type="number" min={0} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} />
          </div>
          <div className="form-actions">
            <Button type="submit">Save tier</Button>
            <Button type="button" kind="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: 16 }}>
          <Button kind="tertiary" renderIcon={Add} onClick={() => setDraft({ name: '', price: '0', capacity: '50' })}>
            Add tier
          </Button>
        </div>
      )}
    </>
  )
}

function Attendees({ eventId }: { eventId: number }) {
  const { data, error } = useFetch<Paginated<Booking>>(`/bookings?event_id=${eventId}&per_page=50`)

  if (error) return <Notice tone="error">{error}</Notice>
  if (!data) return <Skeleton rows={5} />
  if (data.data.length === 0) return <p className="empty">Nobody has booked yet.</p>

  return (
    <Table aria-label="Attendees">
      <TableHead>
        <TableRow>
          <TableHeader>Attendee</TableHeader>
          <TableHeader>Tier</TableHeader>
          <TableHeader>Booked</TableHeader>
          <TableHeader>Status</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.data.map((b) => (
          <TableRow key={b.id}>
            <TableCell>
              <strong>{b.customer?.name}</strong>
              <span className="sub">{b.customer?.email}</span>
            </TableCell>
            <TableCell>{b.ticket_type?.name}</TableCell>
            <TableCell>{formatWhen(b.booked_at)}</TableCell>
            <TableCell>
              <StatusTag status={b.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function StatsPanel({ stats }: { stats: EventStats }) {
  return (
    <section>
      <div className="stat-row">
        <div>
          <strong>
            {stats.held}/{stats.capacity}
          </strong>
          <span>Seats held ({stats.fill_rate}%)</span>
        </div>
        <div>
          <strong>{stats.attended}</strong>
          <span>Checked in ({stats.check_in_rate}%)</span>
        </div>
        <div>
          <strong>{stats.waitlisted}</strong>
          <span>On the waitlist</span>
        </div>
        <div>
          <strong>{stats.event_ended ? stats.no_show : stats.seats_remaining}</strong>
          <span>{stats.event_ended ? 'No-shows' : 'Seats open'}</span>
        </div>
      </div>
      <ProgressBar label="Checked in" value={stats.attended} max={Math.max(stats.held, 1)} helperText={`${stats.attended} of ${stats.held} guests have checked in`} />
    </section>
  )
}
