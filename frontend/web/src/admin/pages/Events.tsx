import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ContentSwitcher,
  OverflowMenu,
  OverflowMenuItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Select,
  SelectItem,
} from '@carbon/react'
import { Calendar } from '@carbon/icons-react'
import { api, errorText, type EventItem, type EventStatus, type Paginated } from '@/lib/api'
import { useFetch } from '@/lib/useFetch'
import { useFeedback } from '@/dashboard/feedback'
import { EmptyState, PageHeader, TablePager } from '@/dashboard/parts'
import { ModeTag, Notice, Skeleton, StatusTag, formatWhen } from '@/dashboard/ui'

const CATEGORY: Record<EventItem['category'], string> = { ctf: 'CTF', bootcamp: 'Bootcamp', conference: 'Conference', workshop: 'Workshop' }
const TABS: { key: '' | EventStatus; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Draft' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'completed', label: 'Completed' },
]

export default function EventsPage() {
  const { toast, confirm } = useFeedback()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as '' | EventStatus
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'' | 'physical' | 'online'>('')

  const qs = new URLSearchParams({ page: String(page), per_page: String(size), sort: 'start_at', direction: 'desc' })
  if (status) qs.set('status', status)
  if (query) qs.set('search', query)
  if (mode) qs.set('mode', mode)
  const { data: rows, error, reload } = useFetch<Paginated<EventItem>>(`/events?${qs}`)

  async function setEventStatus(ev: EventItem, next: EventStatus) {
    if (next === 'cancelled') {
      const ok = await confirm({
        title: `Cancel ${ev.title}?`,
        body: 'Every active booking is cancelled, paid tickets are refunded, and the attendees are emailed. This cannot be undone.',
        confirmLabel: 'Cancel the event',
        danger: true,
      })
      if (!ok) return
    }
    try {
      const res = await api<EventItem & { cancelled_bookings?: number }>(`/events/${ev.id}`, { method: 'PUT', body: { status: next } })
      toast({
        kind: 'success',
        title: res.cancelled_bookings ? `${ev.title} cancelled` : `${ev.title} is now ${next}`,
        subtitle: res.cancelled_bookings ? `${res.cancelled_bookings} bookings were cancelled and the attendees emailed.` : undefined,
      })
      reload()
    } catch (err) {
      toast({ kind: 'error', title: 'Could not change the event', subtitle: errorText(err) })
    }
  }

  async function remove(ev: EventItem) {
    const ok = await confirm({ title: `Delete ${ev.title}?`, body: 'The event and its ticket tiers are removed for good.', confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await api(`/events/${ev.id}`, { method: 'DELETE' })
      toast({ kind: 'success', title: `${ev.title} deleted` })
      reload()
    } catch (err) {
      toast({ kind: 'error', title: 'Could not delete the event', subtitle: errorText(err) })
    }
  }

  const changeTab = (key: string) => {
    setPage(1)
    setParams(key ? { status: key } : {})
  }

  return (
    <>
      <PageHeader title="Events" description="Every event on the platform. Open one to see its sales, or publish, cancel or remove it here." />

      <div className="chips">
        <ContentSwitcher size="md" selectedIndex={Math.max(0, TABS.findIndex((t) => t.key === status))} onChange={({ index }: { index?: number }) => changeTab(TABS[index ?? 0].key)}>
          {TABS.map((t) => (
            <Switch key={t.label} name={t.key || 'all'} text={t.label} />
          ))}
        </ContentSwitcher>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <TableContainer>
        <TableToolbar aria-label="Event list tools">
          <TableToolbarContent>
            <Select
              id="mode-filter"
              labelText="Type"
              hideLabel
              size="lg"
              value={mode}
              onChange={(e) => {
                setPage(1)
                setMode(e.target.value as '' | 'physical' | 'online')
              }}
              style={{ minWidth: 160 }}
            >
              <SelectItem value="" text="All types" />
              <SelectItem value="physical" text="In person" />
              <SelectItem value="online" text="Online" />
            </Select>
            <TableToolbarSearch
              persistent
              placeholder="Search events by title"
              onChange={(e: React.ChangeEvent<HTMLInputElement> | '', value?: string) => {
                setPage(1)
                setQuery(value ?? (e ? e.target.value : ''))
              }}
            />
          </TableToolbarContent>
        </TableToolbar>

        {!rows ? (
          <Skeleton rows={6} />
        ) : rows.data.length === 0 ? (
          <EmptyState icon={<Calendar size={32} />} title="No events match">
            Try another status or search. Organisers create events from their own dashboard.
          </EmptyState>
        ) : (
          <Table aria-label="Events">
            <TableHead>
              <TableRow>
                <TableHeader>Event</TableHeader>
                <TableHeader>Starts</TableHeader>
                <TableHeader>Seats held</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.data.map((ev) => {
                const held = (ev.capacity ?? 0) - (ev.seats_remaining ?? 0)
                return (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <Link className="cell-link cell-title" to={`/admin/events/${ev.id}`}>
                        {ev.title}
                      </Link>{' '}
                      <ModeTag mode={ev.mode} />
                      <span className="sub">
                        {CATEGORY[ev.category]}
                        {ev.mode === 'online' ? ', Online meeting' : ev.venue ? `, ${ev.venue.name}` : ''}
                      </span>
                    </TableCell>
                    <TableCell>{formatWhen(ev.start_at)}</TableCell>
                    <TableCell style={{ minWidth: 150 }}>
                      {ev.capacity ? (
                        <>
                          <span className="mini-bar">
                            <i style={{ width: `${(held / ev.capacity) * 100}%` }} />
                          </span>
                          <span className="sub">
                            {held} of {ev.capacity}
                          </span>
                        </>
                      ) : (
                        <span className="sub">No tickets yet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusTag status={ev.status} />
                    </TableCell>
                    <TableCell>
                      <div className="row-actions">
                        <OverflowMenu flipped aria-label={`Actions for ${ev.title}`} size="sm">
                          <OverflowMenuItem itemText="Open" href={`/admin/events/${ev.id}`} />
                          {ev.status !== 'published' && ev.status !== 'cancelled' && <OverflowMenuItem itemText="Publish" onClick={() => setEventStatus(ev, 'published')} />}
                          {ev.status === 'published' && <OverflowMenuItem itemText="Move back to draft" onClick={() => setEventStatus(ev, 'draft')} />}
                          {ev.status === 'published' && <OverflowMenuItem itemText="Mark as completed" onClick={() => setEventStatus(ev, 'completed')} />}
                          {ev.status !== 'cancelled' && <OverflowMenuItem itemText="Cancel event" isDelete hasDivider onClick={() => setEventStatus(ev, 'cancelled')} />}
                          <OverflowMenuItem itemText="Delete" isDelete onClick={() => remove(ev)} />
                        </OverflowMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {rows && rows.total > 0 && (
          <TablePager
            page={rows.current_page}
            pageSize={size}
            total={rows.total}
            onChange={(p, s) => {
              setPage(s !== size ? 1 : p)
              setSize(s)
            }}
          />
        )}
      </TableContainer>
    </>
  )
}
