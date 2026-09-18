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

export function Notice({ tone, children }: { tone: "ok" | "error" | "warn"; children: React.ReactNode }) {
  return (
    <div className="notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      {children}
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
