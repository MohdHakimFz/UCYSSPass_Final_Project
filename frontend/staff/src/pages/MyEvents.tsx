import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import type { EventItem, Paginated } from '../lib/api'
import { CATEGORY_LABEL, Notice, SeatBar, Tag, formatWhen, Skeleton } from '../components/ui'

export default function MyEvents() {
  const { user } = useAuth()
  const mine = user?.role === 'organiser' ? `&organiser_id=${user.id}` : ''
  const { data, error } = useFetch<Paginated<EventItem>>(
    `/events?per_page=50&sort=start_at&direction=desc${mine}`,
  )

  return (
    <>
      <div className="page-head">
        <h1>My events</h1>
        <Link className="btn" to="/events/new">
          Create event
        </Link>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {!data && !error ? (
        <Skeleton rows={5} />
      ) : data && data.data.length === 0 ? (
        <p className="empty">You haven&apos;t created an event yet. Create one, then add ticket tiers so people can book.</p>
      ) : (
        data && (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Starts</th>
                  <th>Seats held</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.data.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <strong>{ev.title}</strong>
                      <span className="sub">
                        {CATEGORY_LABEL[ev.category]} · {ev.venue?.name ?? 'No venue'}
                      </span>
                    </td>
                    <td data-label="Starts">{formatWhen(ev.start_at)}</td>
                    <td data-label="Seats held" style={{ minWidth: 150 }}>
                      {ev.capacity ? (
                        <div style={{ width: '100%' }}>
                          <SeatBar capacity={ev.capacity} remaining={ev.seats_remaining ?? 0} />
                          <span className="sub">
                            {ev.capacity - (ev.seats_remaining ?? 0)} of {ev.capacity}
                          </span>
                        </div>
                      ) : (
                        <span className="sub">No tickets yet</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <Tag status={ev.status} />
                    </td>
                    <td className="actions">
                      <Link className="btn-quiet" to={`/events/${ev.id}`}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  )
}
