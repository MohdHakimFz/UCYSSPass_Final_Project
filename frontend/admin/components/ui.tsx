import type { BookingStatus, EventStatus } from "@/lib/api";

const TONES: Record<string, { tone: string; label: string }> = {
  confirmed: { tone: "cleared", label: "Confirmed" },
  published: { tone: "cleared", label: "Published" },
  waitlisted: { tone: "held", label: "Waitlisted" },
  pending: { tone: "held", label: "Pending" },
  draft: { tone: "held", label: "Draft" },
  cancelled: { tone: "revoked", label: "Cancelled" },
  attended: { tone: "attended", label: "Checked in" },
  completed: { tone: "attended", label: "Completed" },
};

export function Tag({ status }: { status: BookingStatus | EventStatus }) {
  const t = TONES[status];
  return (
    <span className="tag" data-tone={t.tone}>
      {t.label}
    </span>
  );
}

function NoticeIcon({ tone }: { tone: "ok" | "error" | "warn" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tone === "ok" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l3 3 5-6" />
        </>
      )}
      {tone === "error" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V13M12 16.5v.01" />
        </>
      )}
      {tone === "warn" && (
        <>
          <path d="M12 3.5l9.5 16.5h-19z" />
          <path d="M12 10v4.5M12 17.5v.01" />
        </>
      )}
    </svg>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "error" | "warn"; children: React.ReactNode }) {
  return (
    <div className="notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <NoticeIcon tone={tone} />
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

export function Pager({
  page,
  last,
  total,
  onPage,
}: {
  page: number;
  last: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (last <= 1) return <p className="pager">{total} in total</p>;
  return (
    <div className="pager">
      <button className="btn-quiet" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {last} · {total} in total
      </span>
      <button className="btn-quiet" disabled={page >= last} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
