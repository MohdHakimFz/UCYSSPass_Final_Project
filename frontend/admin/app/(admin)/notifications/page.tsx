"use client";

import { useState } from "react";
import type { NotificationRow, Paginated } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { Notice, Pager, formatWhen } from "@/components/ui";

const TYPES = [
  { value: "confirmation", label: "Booking confirmed" },
  { value: "waitlist_promoted", label: "Promoted from waitlist" },
  { value: "cancelled", label: "Booking cancelled" },
] as const;

function delivery(n: NotificationRow) {
  const r = n.provider_response;
  if (!r) return { tone: "held", label: "Pending" };
  if (r.status === "skipped") return { tone: "held", label: "Not sent (no API key)" };
  if (typeof r.status === "number" && r.status >= 200 && r.status < 300) return { tone: "cleared", label: "Delivered to provider" };
  return { tone: "revoked", label: "Provider rejected it" };
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
        <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          Show
          <select
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
          </select>
        </label>
      </div>

      {!data && !error ? (
        <p className="loading">Loading emails…</p>
      ) : data && data.data.length === 0 ? (
        <p className="empty">No emails yet. They appear when someone books, cancels or is promoted from a waitlist.</p>
      ) : (
        data && (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Email</th>
                  <th>Sent</th>
                  <th>Delivery</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((n) => {
                  const d = delivery(n);
                  return (
                    <tr key={n.id}>
                      <td>
                        <strong>{n.booking?.customer?.name ?? "Deleted booking"}</strong>
                        <span className="sub">{n.booking?.customer?.email}</span>
                      </td>
                      <td data-label="Email">
                        <div>
                          {TYPES.find((t) => t.value === n.type)?.label}
                          <span className="sub">{n.booking?.ticket_type?.event?.title}</span>
                        </div>
                      </td>
                      <td data-label="Sent">{n.sent_at ? formatWhen(n.sent_at) : "Not yet"}</td>
                      <td data-label="Delivery">
                        <div>
                          <span className="tag" data-tone={d.tone}>
                            {d.label}
                          </span>
                          <details className="raw">
                            <summary>Raw response</summary>
                            <pre>{JSON.stringify(n.provider_response, null, 2)}</pre>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      {data && <Pager page={data.current_page} last={data.last_page} total={data.total} onPage={setPage} />}
    </>
  );
}
