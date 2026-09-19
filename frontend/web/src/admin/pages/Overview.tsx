import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react'
import { Calendar, Currency, Hourglass, Ticket, UserFollow } from '@carbon/icons-react'
import { api, errorText, type Stats } from '@/lib/api'
import { EmptyState, PageHeader, StatTile, money } from '@/dashboard/parts'
import { Notice, Skeleton, StatusTag, formatWhen } from '@/dashboard/ui'

const CATEGORY_LABEL: Record<string, string> = { ctf: 'CTF', bootcamp: 'Bootcamp', conference: 'Conference', workshop: 'Workshop' }
const ROLE_LABEL = { admin: 'Administrators', organiser: 'Organisers', customer: 'Customers' } as const

const ago = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`
  return `${Math.round(minutes / 1440)} d ago`
}

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Stats>('/admin/stats')
      .then(setStats)
      .catch((e) => setError(errorText(e)))
  }, [])

  if (error) return <Notice tone="error">{error}</Notice>
  if (!stats)
    return (
      <>
        <PageHeader title="Overview" description="How SentryPass is doing right now." />
        <Skeleton rows={8} />
      </>
    )

  const by = stats.bookings_by_status
  const waiting = by.waitlisted ?? 0
  const sold = (by.confirmed ?? 0) + (by.attended ?? 0)
  const capacity = stats.seat_manifest.reduce((n, e) => n + e.capacity, 0)
  const held = stats.seat_manifest.reduce((n, e) => n + (e.capacity - e.seats_remaining), 0)
  const fill = capacity ? Math.round((held / capacity) * 100) : 0
  const checkInRate = sold ? Math.round(((by.attended ?? 0) / sold) * 100) : 0
  const last14 = stats.bookings_per_day.reduce((n, d) => n + d.total, 0)
  const catMax = Math.max(1, ...Object.values(stats.events_by_category))
  const statusOrder = ['confirmed', 'attended', 'waitlisted', 'pending', 'cancelled'] as const
  const statusMax = Math.max(1, ...statusOrder.map((s) => by[s] ?? 0))

  const attention = [
    { label: 'People waiting on sold-out tickets', value: waiting, to: '/admin/bookings?status=waitlisted', show: waiting > 0 },
    { label: 'Seats held while people pay', value: stats.pending_holds, to: '/admin/bookings?status=pending', show: stats.pending_holds > 0 },
    { label: 'Draft events not yet published', value: stats.draft_events, to: '/admin/events?status=draft', show: stats.draft_events > 0 },
  ].filter((a) => a.show)

  return (
    <>
      <PageHeader title="Overview" description="How SentryPass is doing right now: money, seats and what needs a look." />

      <div className="kpis">
        <StatTile
          label="Net revenue"
          value={money(stats.revenue.net)}
          note={`${money(stats.revenue.gross)} taken, ${money(stats.revenue.refunded)} refunded`}
          trend={stats.revenue_per_day.map((d) => d.total)}
          tone="green"
          icon={<Currency size={20} />}
        />
        <StatTile
          label="Tickets sold"
          value={sold}
          note={`${last14} new bookings in the last 14 days`}
          trend={stats.bookings_per_day.map((d) => d.total)}
          icon={<Ticket size={20} />}
        />
        <StatTile label="Seats held" value={`${fill}`} unit="%" note={`${held} of ${capacity} seats across ${stats.seat_manifest.length} upcoming events`} icon={<Calendar size={20} />} />
        <StatTile label="Check-in rate" value={`${checkInRate}`} unit="%" note={`${by.attended ?? 0} of ${sold} guests have arrived`} icon={<UserFollow size={20} />} />
      </div>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Upcoming events</h2>
            <Link className="cell-link" to="/admin/events">
              All events
            </Link>
          </div>
          {stats.seat_manifest.length === 0 ? (
            <EmptyState icon={<Calendar size={32} />} title="No published events coming up">
              Organisers publish events from their dashboard. They appear here once they are on sale.
            </EmptyState>
          ) : (
            <Table aria-label="Upcoming events">
              <TableHead>
                <TableRow>
                  <TableHeader>Event</TableHeader>
                  <TableHeader>Starts</TableHeader>
                  <TableHeader>Seats held</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.seat_manifest.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link className="cell-link cell-title" to={`/admin/events/${e.id}`}>
                        {e.title}
                      </Link>
                      <span className="sub">{e.venue ?? 'No venue'}</span>
                    </TableCell>
                    <TableCell>{formatWhen(e.start_at)}</TableCell>
                    <TableCell style={{ minWidth: 170 }}>
                      <span className="mini-bar" role="img" aria-label={`${e.capacity - e.seats_remaining} of ${e.capacity} seats held`}>
                        <i style={{ width: `${e.capacity ? ((e.capacity - e.seats_remaining) / e.capacity) * 100 : 0}%` }} />
                      </span>
                      <span className="sub">
                        {e.capacity - e.seats_remaining} of {e.capacity}
                        {e.waitlisted > 0 ? `, ${e.waitlisted} waiting` : ''}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Needs attention</h2>
          </div>
          {attention.length === 0 ? (
            <EmptyState icon={<Hourglass size={32} />} title="Nothing waiting on you">
              No waitlists, unpaid holds or unpublished drafts right now.
            </EmptyState>
          ) : (
            <ul className="attention">
              {attention.map((a) => (
                <li key={a.label}>
                  <Link to={a.to}>{a.label}</Link>
                  <strong>{a.value}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Recent activity</h2>
            <Link className="cell-link" to="/admin/bookings">
              All bookings
            </Link>
          </div>
          {stats.recent_activity.length === 0 ? (
            <EmptyState title="No bookings yet">Bookings appear here as soon as someone books.</EmptyState>
          ) : (
            <ul className="feed">
              {stats.recent_activity.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.customer ?? 'Someone'}</strong> · {a.event ?? 'an event'}
                  </span>
                  <span className="feed-when">{ago(a.at)}</span>
                  <span className="feed-sub">
                    {a.tier} <StatusTag status={a.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Booking outcomes</h2>
          </div>
          <ul className="attention">
            {statusOrder.map((s) => (
              <li key={s}>
                <span style={{ flex: 1 }}>
                  <StatusTag status={s} />
                  <span className="mini-bar" style={{ marginTop: 8 }}>
                    <i style={{ width: `${((by[s] ?? 0) / statusMax) * 100}%` }} />
                  </span>
                </span>
                <strong>{by[s] ?? 0}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h2>Events by type</h2>
          </div>
          <ul className="attention">
            {Object.entries(stats.events_by_category)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => (
                <li key={cat}>
                  <span style={{ flex: 1 }}>
                    {CATEGORY_LABEL[cat] ?? cat}
                    <span className="mini-bar" style={{ marginTop: 8 }}>
                      <i style={{ width: `${(n / catMax) * 100}%` }} />
                    </span>
                  </span>
                  <strong>{n}</strong>
                </li>
              ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>People on the platform</h2>
            <Link className="cell-link" to="/admin/users">
              Manage
            </Link>
          </div>
          <ul className="attention">
            {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => (
              <li key={r}>
                <span>{ROLE_LABEL[r]}</span>
                <strong>{stats.users_by_role[r] ?? 0}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
