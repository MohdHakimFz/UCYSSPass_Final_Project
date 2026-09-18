"use client";

import { Button, InlineNotification, SkeletonText, Tag as CarbonTag } from "@carbon/react";
import type { BookingStatus, EventStatus } from "@/lib/api";

const TONES: Record<string, { type: "green" | "blue" | "red" | "gray" | "warm-gray"; label: string }> = {
  confirmed: { type: "green", label: "Confirmed" },
  published: { type: "green", label: "Published" },
  waitlisted: { type: "warm-gray", label: "Waitlisted" },
  pending: { type: "warm-gray", label: "Pending" },
  draft: { type: "gray", label: "Draft" },
  cancelled: { type: "red", label: "Cancelled" },
  attended: { type: "blue", label: "Checked in" },
  completed: { type: "blue", label: "Completed" },
};

export function Tag({ status }: { status: BookingStatus | EventStatus }) {
  const t = TONES[status];
  return (
    <CarbonTag type={t.type} size="md">
      {t.label}
    </CarbonTag>
  );
}

const KIND = { ok: "success", error: "error", warn: "warning" } as const;

export function Notice({ tone, children }: { tone: "ok" | "error" | "warn"; children: React.ReactNode }) {
  return (
    <InlineNotification
      lowContrast
      hideCloseButton
      kind={KIND[tone]}
      title=""
      subtitle={children as string}
      style={{ maxWidth: "100%", marginBottom: 16 }}
    />
  );
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return <SkeletonText paragraph lineCount={rows} width="100%" />;
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
      <Button kind="tertiary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {last}, {total} in total
      </span>
      <Button kind="tertiary" size="sm" disabled={page >= last} onClick={() => onPage(page + 1)}>
        Next
      </Button>
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
