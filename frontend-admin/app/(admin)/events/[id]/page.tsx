"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  downloadFile,
  errorText,
  type Booking,
  type EventDetail,
  type EventStats,
  type Paginated,
} from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, Tag, formatWhen } from "@/components/ui";

const CATEGORY = { ctf: "CTF", bootcamp: "Bootcamp", conference: "Conference", workshop: "Workshop" } as const;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [note, setNote] = useState<string | null>(null);

  const { data: event, error } = useFetch<EventDetail>(`/events/${id}`);
  const { data: stats } = useFetch<EventStats>(`/events/${id}/stats`);
  const { data: bookings } = useFetch<Paginated<Booking>>(`/bookings?event_id=${id}&per_page=10&page=${page}`);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!event) return <p className="loading">Loading event…</p>;

  const waitByTier = new Map(stats?.tiers.map((t) => [t.id, t.waitlisted]));

  return (
    <>
      <p className="crumb">
        <Link href="/events">← All events</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{event.title}</h1>
          <p className="lede-sub" style={{ marginTop: 8 }}>
            {CATEGORY[event.category]} · {formatWhen(event.start_at)} · {event.venue?.name ?? "No venue"}
            {event.venue?.address ? `, ${event.venue.address}` : ""}
          </p>
        </div>
        <Tag status={event.status} />
      </div>

      {note && <Notice tone="error">{note}</Notice>}
      {event.description && <p className="prose">{event.description}</p>}

      {stats && (
        <section>
          <h2 className="section-title">How it&apos;s going</h2>
          <p className="lede-sub" style={{ marginTop: 0, marginBottom: 20 }}>
            {stats.held} of {stats.capacity} seats are held ({stats.fill_rate}%).{" "}
            {stats.attended} of {stats.held} guests have checked in ({stats.check_in_rate}%).{" "}
            {stats.waitlisted > 0 ? `${stats.waitlisted} ${stats.waitlisted === 1 ? "person is" : "people are"} waiting for a seat. ` : ""}
            {stats.event_ended ? `${stats.no_show} confirmed guests never showed up.` : ""}
          </p>
          <div
            className="bar"
            role="img"
            aria-label={`${stats.attended} checked in, ${stats.confirmed} confirmed, ${stats.seats_remaining} open`}
          >
            <i className="b-attended" style={{ width: `${stats.capacity ? (stats.attended / stats.capacity) * 100 : 0}%` }} />
            <i className="b-confirmed" style={{ width: `${stats.capacity ? (stats.confirmed / stats.capacity) * 100 : 0}%` }} />
          </div>
          <div className="key">
            <span style={{ ["--sw" as string]: "var(--ink)" }}>Checked in</span>
            <span style={{ ["--sw" as string]: "var(--cleared)" }}>Confirmed, not yet arrived</span>
            <span style={{ ["--sw" as string]: "#d2d9df" }}>Open seat</span>
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Ticket tiers</h2>
        {(event.ticket_types ?? []).length === 0 ? (
          <p className="empty">No tiers yet. The organiser adds these from their portal.</p>
        ) : (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Price</th>
                  <th>Seats left</th>
                  <th>Waitlist</th>
                </tr>
              </thead>
              <tbody>
                {event.ticket_types!.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.name}</strong>
                    </td>
                    <td data-label="Price">{Number(t.price) === 0 ? "Free" : `RM ${Number(t.price).toFixed(2)}`}</td>
                    <td data-label="Seats left">
                      {t.seats_remaining} of {t.capacity}
                    </td>
                    <td data-label="Waitlist">{waitByTier.get(t.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="page-head" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            Bookings
          </h2>
          <button
            className="btn-quiet"
            onClick={() => downloadFile(`/events/${id}/export`, `attendees-event-${id}.csv`).catch((e) => setNote(errorText(e)))}
          >
            Export attendees (CSV)
          </button>
        </div>
        {!bookings ? (
          <p className="loading">Loading bookings…</p>
        ) : bookings.data.length === 0 ? (
          <p className="empty">Nobody has booked this event yet.</p>
        ) : (
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
                {bookings.data.map((b) => (
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
        )}
        {bookings && <Pager page={bookings.current_page} last={bookings.last_page} total={bookings.total} onPage={setPage} />}
      </section>
    </>
  );
}
