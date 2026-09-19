import { Link } from 'react-router-dom'
import { Button, OverflowMenu, OverflowMenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@carbon/react'
import { Add, Calendar, Ticket, CheckmarkOutline, Currency } from '@carbon/icons-react'
import { api, errorText } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useFeedback } from '@/dashboard/feedback'
import { useFetch } from '@/lib/useFetch'
import type { EventItem, OrganiserSummary, Paginated } from '@/lib/api'
import { CATEGORY_LABEL, ModeTag, Notice, StatusTag, formatWhen, Skeleton } from '@/dashboard/ui'
import { EmptyState, PageHeader, StatTile, money } from '@/dashboard/parts'

export default function MyEvents() {
  const { user } = useAuth()
  const mine = user?.role === 'organiser' ? `&organiser_id=${user.id}` : ''
  const { toast } = useFeedback()
  const { data, error, reload } = useFetch<Paginated<EventItem>>(`/events?per_page=50&sort=start_at&direction=desc${mine}`)
  const { data: sum } = useFetch<OrganiserSummary>('/organiser/summary')

  async function setStatus(ev: EventItem, next: 'published' | 'draft') {
    try {
      await api(`/events/${ev.id}`, { method: 'PUT', body: { status: next } })
      toast({ kind: 'success', title: next === 'published' ? `${ev.title} is live` : `${ev.title} is back in draft` })
      reload()
    } catch (err) {
      toast({ kind: 'error', title: 'Could not change the event', subtitle: errorText(err) })
    }
  }

  return (
    <>
      <PageHeader
        title="My events"
        description="Your events and how they are selling. Open one to edit it, add ticket tiers and see who is coming."
        actions={
          <Button as={Link} to="/organiser/events/new" renderIcon={Add}>
            Create event
          </Button>
        }
      />

      {sum && (
        <div className="kpis">
          <StatTile label="Upcoming events" value={sum.upcoming} note={`${sum.published} published, ${sum.drafts} in draft`} icon={<Calendar size={20} />} />
          <StatTile label="Tickets sold" value={sum.tickets_sold} note={sum.waitlisted ? `${sum.waitlisted} on waitlists` : 'No waitlists'} icon={<Ticket size={20} />} />
          <StatTile label="Checked in" value={sum.checked_in} note={sum.awaiting_payment ? `${sum.awaiting_payment} seats awaiting payment` : undefined} icon={<CheckmarkOutline size={20} />} />
          <StatTile label="Net revenue" value={money(sum.revenue.net)} note={sum.revenue.refunded ? `${money(sum.revenue.refunded)} refunded` : undefined} tone="green" icon={<Currency size={20} />} />
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <TableContainer>
        {!data && !error ? (
          <Skeleton rows={5} />
        ) : data && data.data.length === 0 ? (
          <EmptyState
            icon={<Calendar size={32} />}
            title="No events yet"
            action={
              <Button as={Link} to="/organiser/events/new" renderIcon={Add}>
                Create your first event
              </Button>
            }
          >
            Create one, then add ticket tiers so people can book.
          </EmptyState>
        ) : (
          data && (
            <Table aria-label="My events">
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
                {data.data.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <Link className="cell-link cell-title" to={`/organiser/events/${ev.id}`}>
                        {ev.title}
                      </Link>{' '}
                      <ModeTag mode={ev.mode} />
                      <span className="sub">
                        {CATEGORY_LABEL[ev.category]}, {ev.mode === 'online' ? 'Online meeting' : (ev.venue?.name ?? 'No venue')}
                      </span>
                    </TableCell>
                    <TableCell>{formatWhen(ev.start_at)}</TableCell>
                    <TableCell style={{ minWidth: 150 }}>
                      {ev.capacity ? (
                        <>
                          <span className="mini-bar">
                            <i style={{ width: `${(((ev.capacity ?? 0) - (ev.seats_remaining ?? 0)) / ev.capacity) * 100}%` }} />
                          </span>
                          <span className="sub">
                            {(ev.capacity ?? 0) - (ev.seats_remaining ?? 0)} of {ev.capacity}
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
                        <OverflowMenu flipped aria-label={`Actions for ${ev.title}`} iconDescription={`Actions for ${ev.title}`} size="sm">
                          <OverflowMenuItem itemText="Manage" href={`/organiser/events/${ev.id}`} />
                          {ev.status === 'draft' && <OverflowMenuItem itemText="Publish" onClick={() => setStatus(ev, 'published')} />}
                          {ev.status === 'published' && <OverflowMenuItem itemText="Move back to draft" onClick={() => setStatus(ev, 'draft')} />}
                          <OverflowMenuItem itemText="Check-in" href="/organiser/check-in" />
                        </OverflowMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}
      </TableContainer>
    </>
  )
}
