"use client";

import { useState } from "react";
import { Select, Tag as CarbonTag, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import type { NotificationRow, Paginated } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, formatWhen, Skeleton } from "@/components/ui";

const TYPES = [
  { value: "confirmation", label: "Booking confirmed" },
  { value: "waitlist_promoted", label: "Promoted from waitlist" },
  { value: "cancelled", label: "Booking cancelled" },
] as const;

function delivery(n: NotificationRow) {
  const r = n.provider_response;
  if (!r) return { type: "warm-gray" as const, label: "Pending" };
  if (r.status === "skipped") return { type: "warm-gray" as const, label: "Not sent (no API key)" };
  const accepted = typeof r.status === "number" ? r.status >= 200 && r.status < 300 : ["delivered", "sent"].includes(String(r.status));
  if (accepted) return { type: "green" as const, label: "Delivered to provider" };
  return { type: "red" as const, label: "Provider rejected it" };
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");

  const qs = new URLSearchParams({ page: String(page), per_page: "12" });
  if (type) qs.set("type", type);
  const { data, error } = useFetch<Paginated<NotificationRow>>(`/admin/notifications?${qs}`);

  return (
    <>
      <div className="page-head">
        <h1>Emails</h1>
      </div>
      <p className="section-note">
        Every booking email the platform tried to send, with the answer it got back from the email provider. Open a row to see the raw response.
      </p>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="toolbar">
        <Select id="s-1" labelText="Show"
            value={type}
            onChange={(e) => {
              setPage(1);
              setType(e.target.value);
            }}
          >
            <option value="">All emails</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
      </div>

      {!data && !error ? (
        <Skeleton rows={5} />
      ) : data && data.data.length === 0 ? (
        <p className="empty">No emails yet. They appear when someone books, cancels or is promoted from a waitlist.</p>
      ) : (
        data && (
          <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Recipient</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Sent</TableHeader>
                  <TableHeader>Delivery</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map((n) => {
                  const d = delivery(n);
                  return (
                    <TableRow key={n.id}>
                      <TableCell>
                        <strong>{n.booking?.customer?.name ?? "Deleted booking"}</strong>
                        <span className="sub">{n.booking?.customer?.email}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          {TYPES.find((t) => t.value === n.type)?.label}
                          <span className="sub">{n.booking?.ticket_type?.event?.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{n.sent_at ? formatWhen(n.sent_at) : "Not yet"}</TableCell>
                      <TableCell>
                        <div>
                          <CarbonTag type={d.type} size="md">
                            {d.label}
                          </CarbonTag>
                          <details className="raw">
                            <summary>Raw response</summary>
                            <pre>{JSON.stringify(n.provider_response, null, 2)}</pre>
                          </details>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        )
      )}
      {data && <Pager page={data.current_page} last={data.last_page} total={data.total} onPage={setPage} />}
    </>
  );
}
