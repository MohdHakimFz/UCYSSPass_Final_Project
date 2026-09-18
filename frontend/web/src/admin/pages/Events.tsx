import { Link } from "react-router-dom";
import { useState } from "react";
import { Button, Search, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { api, errorText, type EventItem, type EventStatus, type Paginated } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, Tag, formatWhen, Skeleton } from "@/dashboard/ui";

const STATUSES: EventStatus[] = ["draft", "published", "cancelled", "completed"];
const CATEGORY: Record<EventItem["category"], string> = {
  ctf: "CTF",
  bootcamp: "Bootcamp",
  conference: "Conference",
  workshop: "Workshop",
};

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const qs = new URLSearchParams({ page: String(page), per_page: "10", sort: "start_at", direction: "desc" });
  if (status) qs.set("status", status);
  if (query) qs.set("search", query);
  const { data: rows, error: loadError, reload: load } = useFetch<Paginated<EventItem>>(`/events?${qs}`);

  async function setEventStatus(ev: EventItem, next: EventStatus) {
    if (next === "cancelled" && !window.confirm(`Cancel ${ev.title}? Every active booking is cancelled and those attendees are emailed.`)) return;
    setNote(null);
    try {
      const res = await api<EventItem & { cancelled_bookings?: number }>(`/events/${ev.id}`, { method: "PUT", body: { status: next } });
      setNote({
        tone: "ok",
        text: res.cancelled_bookings
          ? `${ev.title} is cancelled. ${res.cancelled_bookings} bookings were cancelled and the attendees emailed.`
          : `${ev.title} is now ${next}.`,
      });
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    }
  }

  async function remove(ev: EventItem) {
    if (!window.confirm(`Delete ${ev.title}? This can't be undone.`)) return;
    setNote(null);
    try {
      await api(`/events/${ev.id}`, { method: "DELETE" });
      setNote({ tone: "ok", text: `${ev.title} deleted.` });
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Events</h1>
      </div>

      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {loadError && <Notice tone="error">{loadError}</Notice>}

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <Search size="lg"
          placeholder="Search events by title"
          labelText="Search events by title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select id="s-1" size="sm"
          hideLabel labelText="Filter by status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          style={{ minWidth: 0 }}
        >
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <Button kind="tertiary" size="md">Search</Button>
      </form>

      {!rows ? (
        <Skeleton rows={5} />
      ) : rows.data.length === 0 ? (
        <p className="empty">No events match. Organisers create events from their own portal.</p>
      ) : (
        <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Event</TableHeader>
                <TableHeader>Starts</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.data.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell>
                    <Link to={`/admin/events/${ev.id}`}>
                      <strong>{ev.title}</strong>
                    </Link>
                    <span className="sub">{CATEGORY[ev.category]}</span>
                  </TableCell>
                  <TableCell>{formatWhen(ev.start_at)}</TableCell>
                  <TableCell>
                    <Tag status={ev.status} />
                  </TableCell>
                  <TableCell>
                    <Select id="s-2" size="sm"
                      hideLabel labelText={`Status for ${ev.title}`}
                      value={ev.status}
                      onChange={(e) => setEventStatus(ev, e.target.value as EventStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </Select>{" "}
                    <Button kind="danger--ghost" size="sm" onClick={() => remove(ev)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      )}
      {rows && <Pager page={rows.current_page} last={rows.last_page} total={rows.total} onPage={setPage} />}
    </>
  );
}
