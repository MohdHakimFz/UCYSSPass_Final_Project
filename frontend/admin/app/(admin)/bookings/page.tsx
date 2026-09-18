"use client";

import { useState } from "react";
import { api, downloadFile, errorText, type Booking, type BookingStatus, type Paginated } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, Tag, formatWhen } from "@/components/ui";

const STATUSES: { value: BookingStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "pending", label: "Pending" },
  { value: "attended", label: "Checked in" },
  { value: "cancelled", label: "Cancelled" },
];

export default function BookingsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const qs = new URLSearchParams({ page: String(page), per_page: "12" });
  if (status) qs.set("status", status);
  const { data: rows, error: loadError, reload: load } = useFetch<Paginated<Booking>>(`/bookings?${qs}`);

  async function cancel(b: Booking) {
    if (!window.confirm(`Cancel ${b.customer?.name ?? "this"} booking? If someone is waitlisted they get the seat.`)) return;
    setNote(null);
    try {
      await api(`/bookings/${b.id}/cancel`, { method: "PUT" });
      setNote({ tone: "ok", text: "Booking cancelled." });
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    }
  }

  async function remove(b: Booking) {
    if (!window.confirm("Permanently delete this booking record? Use cancel unless you're cleaning up.")) return;
    setNote(null);
    try {
      await api(`/bookings/${b.id}`, { method: "DELETE" });
      setNote({ tone: "ok", text: "Booking deleted." });
      await load();
    } catch (err) {
      setNote({ tone: "error", text: errorText(err) });
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Bookings</h1>
        <button
          className="btn-quiet"
          onClick={() => downloadFile("/admin/export/bookings", "sentrypass-bookings.csv").catch((e) => setNote({ tone: "error", text: errorText(e) }))}
        >
          Export CSV
        </button>
      </div>

      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {loadError && <Notice tone="error">{loadError}</Notice>}

      <div className="toolbar">
        <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          Show
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All bookings</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!rows ? (
        <p className="loading">Loading bookings…</p>
      ) : rows.data.length === 0 ? (
        <p className="empty">No bookings with that status.</p>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>Attendee</th>
                <th>Event</th>
                <th>Booked</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.data.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.customer?.name ?? "Unknown"}</strong>
                    <span className="sub">{b.customer?.email}</span>
                  </td>
                  <td data-label="Event">
                    <div>
                      {b.ticket_type?.event?.title ?? "Unknown event"}
                      <span className="sub">{b.ticket_type?.name}</span>
                    </div>
                  </td>
                  <td data-label="Booked">{formatWhen(b.booked_at)}</td>
                  <td data-label="Status">
                    <Tag status={b.status} />
                  </td>
                  <td className="actions">
                    {b.status !== "cancelled" && (
                      <button className="btn-quiet" onClick={() => cancel(b)}>
                        Cancel
                      </button>
                    )}{" "}
                    <button className="btn-danger" onClick={() => remove(b)}>
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
