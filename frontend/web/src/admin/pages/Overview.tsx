import { useEffect, useState } from "react";
import { api, errorText, type Stats } from "@/lib/api";
import { Notice, Tag, formatWhen } from "@/dashboard/ui";

const CATEGORY_LABEL: Record<string, string> = { ctf: "CTF", bootcamp: "Bootcamp", conference: "Conference", workshop: "Workshop" };
const ROLE_LABEL = { admin: "Administrators", organiser: "Organisers", customer: "Customers" } as const;

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>("/admin/stats").then(setStats).catch((e) => setError(errorText(e)));
  }, []);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!stats) return <p className="loading">Loading the latest numbers…</p>;

  const waiting = stats.bookings_by_status.waitlisted ?? 0;
  const capacity = stats.seat_manifest.reduce((n, e) => n + e.capacity, 0);
  const held = stats.seat_manifest.reduce((n, e) => n + (e.capacity - e.seats_remaining), 0);
  const upcoming = stats.seat_manifest.length;
  const perDayMax = Math.max(1, ...stats.bookings_per_day.map((d) => d.total));
  const last14 = stats.bookings_per_day.reduce((n, d) => n + d.total, 0);
  const attended = stats.bookings_by_status.attended ?? 0;
  const confirmed = stats.bookings_by_status.confirmed ?? 0;
  const arrivedBase = attended + confirmed;
  const catMax = Math.max(1, ...Object.values(stats.events_by_category));

  return (
    <>
      <div className="page-head">
        <h1>Overview</h1>
      </div>

      <div className="kpis">
        <div className="tile">
          <span className="kpi-label">Seats held</span>
          <strong className="kpi-value">
            {held}
            <small> / {capacity}</small>
          </strong>
          <span className="kpi-note">
            {capacity ? Math.round((held / capacity) * 100) : 0}% across {upcoming} upcoming {upcoming === 1 ? "event" : "events"}
          </span>
        </div>
        <div className="tile">
          <span className="kpi-label">On waitlists</span>
          <strong className="kpi-value">{waiting}</strong>
          <span className="kpi-note">{waiting === 0 ? "Every request has a seat" : "waiting on sold-out tickets"}</span>
        </div>
        <div className="tile">
          <span className="kpi-label">Check-in rate</span>
          <strong className="kpi-value">
            {arrivedBase ? Math.round((attended / arrivedBase) * 100) : 0}
            <small>%</small>
          </strong>
          <span className="kpi-note">
            {attended} of {arrivedBase} confirmed guests
          </span>
        </div>
        <div className="tile">
          <span className="kpi-label">Bookings, 14 days</span>
          <strong className="kpi-value">{last14}</strong>
          <span className="kpi-note">new bookings in the last two weeks</span>
        </div>
      </div>

      <section className="tile">
        <h2 className="section-title">Seat manifest</h2>
        <p className="section-note">Upcoming published events, soonest first. Waitlisted people are counted beside the seat total.</p>
        {upcoming === 0 ? (
          <p className="empty">Nothing to show yet.</p>
        ) : (
          <ul className="manifest">
            {stats.seat_manifest.map((e, i) => {
              const pct = (n: number) => (e.capacity ? (n / e.capacity) * 100 : 0);
              const confirmedOnly = Math.max(0, e.capacity - e.seats_remaining - e.attended);
              return (
                <li key={e.id}>
                  <span className="m-title">
                    {e.title}
                    <span className="m-sub">{formatWhen(e.start_at)}</span>
                  </span>
                  <span className="m-venue">{e.venue ?? "No venue"}</span>
                  <div
                    className="bar"
                    role="img"
                    aria-label={`${e.attended} checked in, ${confirmedOnly} confirmed, ${e.seats_remaining} open`}
                  >
                    <i className="b-attended" style={{ width: `${pct(e.attended)}%`, animationDelay: `${i * 70}ms` }} />
                    <i className="b-confirmed" style={{ width: `${pct(confirmedOnly)}%`, animationDelay: `${i * 70 + 120}ms` }} />
                  </div>
                  <span className="m-count">
                    {e.capacity - e.seats_remaining} / {e.capacity}
                    {e.waitlisted > 0 && <small>{e.waitlisted} waiting</small>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="key">
          <span style={{ ["--sw" as string]: "#0043ce" }}>Checked in</span>
          <span style={{ ["--sw" as string]: "#24a148" }}>Confirmed</span>
          <span style={{ ["--sw" as string]: "#e0e0e0" }}>Open seat</span>
        </div>
      </section>

      <section className="pair">
        <div className="tile">
          <h2 className="section-title">Did people show up?</h2>
          <p className="section-note">
            {arrivedBase === 0
              ? "No confirmed guests yet."
              : `${attended} of ${arrivedBase} confirmed guests have checked in (${Math.round((attended / arrivedBase) * 100)}%).`}
          </p>
          <div className="bar" role="img" aria-label={`${attended} checked in, ${confirmed} not yet arrived`}>
            <i className="b-attended" style={{ width: `${arrivedBase ? (attended / arrivedBase) * 100 : 0}%` }} />
            <i className="b-confirmed" style={{ width: `${arrivedBase ? (confirmed / arrivedBase) * 100 : 0}%` }} />
          </div>
          <div className="key">
            <span style={{ ["--sw" as string]: "#0043ce" }}>Checked in</span>
            <span style={{ ["--sw" as string]: "#24a148" }}>Confirmed, not yet arrived</span>
          </div>
        </div>

        <div className="tile">
          <h2 className="section-title">Events by type</h2>
          <p className="section-note">All events, every status.</p>
          <ul className="hbars">
            {Object.entries(stats.events_by_category)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => (
                <li key={cat}>
                  <span>{CATEGORY_LABEL[cat] ?? cat}</span>
                  <div className="bar">
                    <i className="b-attended" style={{ width: `${(n / catMax) * 100}%` }} />
                  </div>
                  <strong>{n}</strong>
                </li>
              ))}
          </ul>
        </div>
      </section>

      <section className="pair">
        <div className="tile">
          <h2 className="section-title">Bookings, last 14 days</h2>
          <p className="section-note">One bar per day, oldest on the left.</p>
          <div className="days" role="img" aria-label={`${last14} bookings over 14 days`}>
            {stats.bookings_per_day.map((d, i) => (
              <div
                key={d.day}
                data-zero={d.total === 0}
                title={`${d.day}: ${d.total}`}
                style={{ height: `${(d.total / perDayMax) * 100}%`, animationDelay: `${i * 30}ms` }}
              />
            ))}
          </div>
          <div className="days-labels">
            <span>{stats.bookings_per_day[0].day}</span>
            <span>Peak day: {perDayMax === 1 && last14 === 0 ? 0 : perDayMax}</span>
            <span>{stats.bookings_per_day[13].day}</span>
          </div>
        </div>

        <div className="tile">
          <h2 className="section-title">Who&apos;s on the platform</h2>
          <p className="section-note">Accounts by role.</p>
          <ul className="tally">
            {(Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[]).map((r) => (
              <li key={r}>
                <span>{ROLE_LABEL[r]}</span>
                <strong>{stats.users_by_role[r] ?? 0}</strong>
              </li>
            ))}
          </ul>
          <h2 className="section-title" style={{ marginTop: 32 }}>
            Booking outcomes
          </h2>
          <ul className="tally">
            {(["confirmed", "attended", "waitlisted", "pending", "cancelled"] as const).map((s) => (
              <li key={s}>
                <Tag status={s} />
                <strong>{stats.bookings_by_status[s] ?? 0}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
