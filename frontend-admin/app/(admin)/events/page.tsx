"use client";

import { useState } from "react";
import { api, errorText, type EventItem, type EventStatus, type Paginated } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, Tag, formatWhen } from "@/components/ui";

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
    setNote(null);
    try {
      await api(`/events/${ev.id}`, { method: "PUT", body: { status: next } });
      setNote({ tone: "ok", text: `${ev.title} is now ${next}.` });
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
        <input
          className="search"
          type="search"
          placeholder="Search events by title"
          aria-label="Search events by title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="search"
          aria-label="Filter by status"
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
        </select>
        <button className="btn-quiet">Search</button>
      </form>

      {!rows ? (
        <p className="loading">Loading events…</p>
      ) : rows.data.length === 0 ? (
        <p className="empty">No events match. Organisers create events from their own portal.</p>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Event</th>
                <th>Starts</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.data.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <strong>{ev.title}</strong>
                    <span className="sub">{CATEGORY[ev.category]}</span>
                  </td>
                  <td>{formatWhen(ev.start_at)}</td>
                  <td>
                    <Tag status={ev.status} />
                  </td>
                  <td className="actions">
                    <select
                      className="select"
                      aria-label={`Status for ${ev.title}`}
                      value={ev.status}
                      onChange={(e) => setEventStatus(ev, e.target.value as EventStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>{" "}
                    <button className="btn-danger" onClick={() => remove(ev)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && <Pager page={rows.current_page} last={rows.last_page} total={rows.total} onPage={setPage} />}
    </>
  );
}
