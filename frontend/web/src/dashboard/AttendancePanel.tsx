import { Link } from 'react-router-dom'
import { useFetch } from '@/lib/useFetch'
import type { Attendance } from '@/lib/api'
import { EmptyState } from '@/dashboard/parts'
import { Skeleton, formatWhen } from '@/dashboard/ui'
import { UserFollow } from '@carbon/icons-react'

/** Who registered and who really came, for the latest events that have finished. */
export default function AttendancePanel({ base }: { base: '/organiser' | '/admin' }) {
  const { data } = useFetch<Attendance>('/organiser/attendance')

  return (
    <section className="panel" aria-labelledby="attendance-title">
      <div className="panel-head">
        <h2 id="attendance-title">Attendance</h2>
        {data?.rate != null && (
          <span className="sub">
            {data.attended} of {data.registered} who registered came ({data.rate}%)
          </span>
        )}
      </div>

      {!data ? (
        <Skeleton rows={3} />
      ) : data.events.length === 0 ? (
        <EmptyState icon={<UserFollow size={32} />} title="No finished events yet">
          Once an event has ended, you will see how many of the people who registered actually came.
        </EmptyState>
      ) : (
        <ul className="attendance-list">
          {data.events.map((e) => (
            <li key={e.id}>
              <div className="attendance-title">
                <Link className="cell-link" to={`${base}/events/${e.id}`}>
                  {e.title}
                </Link>
                <span className="sub">{formatWhen(e.start_at)}</span>
              </div>
              <span className="mini-bar" aria-hidden="true">
                <i style={{ width: `${e.rate ?? 0}%` }} />
              </span>
              <span className="attendance-figures">
                {e.attended} of {e.registered}
                <strong>{e.rate == null ? 'No bookings' : `${e.rate}%`}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
