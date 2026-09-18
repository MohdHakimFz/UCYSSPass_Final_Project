import { Link } from 'react-router-dom'
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react'
import { Add } from '@carbon/icons-react'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import type { EventItem, Paginated } from '../lib/api'
import { CATEGORY_LABEL, Notice, SeatBar, StatusTag, formatWhen, Skeleton } from '../components/ui'

export default function MyEvents() {
  const { user } = useAuth()
  const mine = user?.role === 'organiser' ? `&organiser_id=${user.id}` : ''
  const { data, error } = useFetch<Paginated<EventItem>>(`/events?per_page=50&sort=start_at&direction=desc${mine}`)

  return (
    <>
      <div className="page-head">
        <h1>My events</h1>
        <Button as={Link} to="/events/new" renderIcon={Add}>
          Create event
        </Button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {!data && !error ? (
        <Skeleton rows={5} />
      ) : data && data.data.length === 0 ? (
        <p className="empty">You haven&apos;t created an event yet. Create one, then add ticket tiers so people can book.</p>
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
                    <strong>{ev.title}</strong>
                    <span className="sub">
                      {CATEGORY_LABEL[ev.category]}, {ev.venue?.name ?? 'No venue'}
                    </span>
                  </TableCell>
                  <TableCell>{formatWhen(ev.start_at)}</TableCell>
                  <TableCell style={{ minWidth: 180 }}>
                    {ev.capacity ? <SeatBar capacity={ev.capacity} remaining={ev.seats_remaining ?? 0} /> : <span className="sub">No tickets yet</span>}
                  </TableCell>
                  <TableCell>
                    <StatusTag status={ev.status} />
                  </TableCell>
                  <TableCell>
                    <Button as={Link} to={`/events/${ev.id}`} kind="ghost" size="sm">
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}
    </>
  )
}
