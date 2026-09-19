import { useParams } from "react-router-dom";
import { useState } from "react";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import {
  downloadFile,
  errorText,
  type Booking,
  type EventDetail,
  type EventStats,
  type Paginated,
} from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { PageHeader } from "@/dashboard/parts";
import SeatMapPanel from "@/dashboard/SeatMapPanel";
import { Notice, Pager, Tag, formatWhen, Skeleton } from "@/dashboard/ui";

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
      <PageHeader
        crumbs={[{ label: "Events", to: "/admin/events" }, { label: event.title }]}
        title={event.title}
        status={<Tag status={event.status} />}
        description={`${CATEGORY[event.category]} · ${formatWhen(event.start_at)} · ${event.venue?.name ?? "No venue"}${event.venue?.address ? `, ${event.venue.address}` : ""}`}
      />

      {note && <Notice tone="error">{note}</Notice>}
      {event.description && <p className="prose">{event.description}</p>}

      {stats && (
        <section>
          <h2 className="section-title">How it&apos;s going</h2>
          <p className="lede-sub" style={{ marginTop: 0, marginBottom: 20 }}>
            {stats.held} of {stats.capacity} seats are held ({stats.fill_rate}%).{" "}
            {stats.attended} of {stats.held} guests have checked in ({stats.check_in_rate}%).{" "}
            {stats.waitlisted > 0 ? `${stats.waitlisted} ${stats.waitlisted === 1 ? "person is" : "people are"} waiting for a seat. ` : ""}
            {stats.event_ended && stats.no_show > 0 ? `${stats.no_show} confirmed ${stats.no_show === 1 ? "guest" : "guests"} did not attend.` : ""}
          </p>
          <div
            className="bar"
            role="img"
            aria-label={`${stats.attended} checked in, ${stats.confirmed} ${stats.event_ended ? "did not attend" : "confirmed"}, ${stats.seats_remaining} open`}
          >
            <i className="b-attended" style={{ width: `${stats.capacity ? (stats.attended / stats.capacity) * 100 : 0}%` }} />
            <i className={stats.event_ended ? "b-noshow" : "b-confirmed"} style={{ width: `${stats.capacity ? (stats.confirmed / stats.capacity) * 100 : 0}%` }} />
          </div>
          <div className="key">
            <span style={{ ["--sw" as string]: "#0043ce" }}>Checked in</span>
            <span style={{ ["--sw" as string]: stats.event_ended ? "#da1e28" : "#24a148" }}>{stats.event_ended ? "Did not attend" : "Confirmed, not yet arrived"}</span>
            <span style={{ ["--sw" as string]: "#e0e0e0" }}>Open seat</span>
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Ticket tiers</h2>
        {(event.ticket_types ?? []).length === 0 ? (
          <p className="empty">No tiers yet. The organiser adds these from their portal.</p>
        ) : (
          <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Tier</TableHeader>
                  <TableHeader>Price</TableHeader>
                  <TableHeader>Seats left</TableHeader>
                  <TableHeader>Waitlist</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {event.ticket_types!.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <strong>{t.name}</strong>
                    </TableCell>
                    <TableCell>{Number(t.price) === 0 ? "Free" : `RM ${Number(t.price).toFixed(2)}`}</TableCell>
                    <TableCell>
                      {t.seats_remaining} of {t.capacity}
                    </TableCell>
                    <TableCell>{waitByTier.get(t.id) ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </section>

      {event.mode !== 'online' && event.seated && (
        <section>
          <h2 className="section-title">Seat map</h2>
          <SeatMapPanel eventId={event.id} />
        </section>
      )}

      <section>
        <div className="page-head" style={{ marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            Bookings
          </h2>
          <Button
            kind="tertiary" size="md"
            onClick={() => downloadFile(`/events/${id}/export`, `attendees-event-${id}.csv`).catch((e) => setNote(errorText(e)))}
          >
            Export attendees (CSV)
          </Button>
        </div>
        {!bookings ? (
          <Skeleton rows={5} />
        ) : bookings.data.length === 0 ? (
          <p className="empty">Nobody has booked this event yet.</p>
        ) : (
          <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Attendee</TableHeader>
                  <TableHeader>Tier</TableHeader>
                  <TableHeader>Booked</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.data.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <strong>{b.customer?.name}</strong>
                      <span className="sub">{b.customer?.email}</span>
                    </TableCell>
                    <TableCell>{b.ticket_type?.name}</TableCell>
                    <TableCell>{formatWhen(b.booked_at)}</TableCell>
                    <TableCell>
                      <Tag status={b.status} endedAt={event.end_at} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
        {bookings && <Pager page={bookings.current_page} last={bookings.last_page} total={bookings.total} onPage={setPage} />}
      </section>
    </>
  );
}
