import { useState } from "react";
import { Button, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { api, downloadFile, errorText, type Booking, type BookingStatus, type Paginated } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, Tag, formatWhen, Skeleton } from "@/dashboard/ui";

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
        <Button
          kind="tertiary" size="md"
          onClick={() => downloadFile("/admin/export/bookings", "sentrypass-bookings.csv").catch((e) => setNote({ tone: "error", text: errorText(e) }))}
        >
          Export CSV
        </Button>
      </div>

      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      {loadError && <Notice tone="error">{loadError}</Notice>}

      <div className="toolbar">
        <Select id="s-1" labelText="Show"
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
          </Select>
      </div>

      {!rows ? (
        <Skeleton rows={5} />
      ) : rows.data.length === 0 ? (
        <p className="empty">No bookings with that status.</p>
      ) : (
        <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Attendee</TableHeader>
                <TableHeader>Event</TableHeader>
                <TableHeader>Booked</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.data.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <strong>{b.customer?.name ?? "Unknown"}</strong>
                    <span className="sub">{b.customer?.email}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      {b.ticket_type?.event?.title ?? "Unknown event"}
                      <span className="sub">{b.ticket_type?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatWhen(b.booked_at)}</TableCell>
                  <TableCell>
                    <Tag status={b.status} />
                  </TableCell>
                  <TableCell>
                    {b.status !== "cancelled" && (
                      <Button kind="ghost" size="sm" onClick={() => cancel(b)}>
                        Cancel
                      </Button>
                    )}{" "}
                    <Button kind="danger--ghost" size="sm" onClick={() => remove(b)}>
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
