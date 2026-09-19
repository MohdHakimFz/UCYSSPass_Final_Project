import { Button, InlineNotification, ProgressBar, SkeletonText, Tag as CarbonTag } from '@carbon/react'
import type { BookingStatus, EventStatus } from '../lib/api'

const TONES: Record<string, { type: 'green' | 'blue' | 'red' | 'gray' | 'warm-gray'; label: string }> = {
  confirmed: { type: 'green', label: 'Confirmed' },
  published: { type: 'green', label: 'Published' },
  waitlisted: { type: 'warm-gray', label: 'Waitlisted' },
  pending: { type: 'warm-gray', label: 'Pending' },
  draft: { type: 'gray', label: 'Draft' },
  cancelled: { type: 'red', label: 'Cancelled' },
  attended: { type: 'blue', label: 'Checked in' },
  completed: { type: 'blue', label: 'Completed' },
}

/** `endedAt` is the end of the booking's event: a confirmed guest whose event is over never came. */
export function StatusTag({ status, endedAt }: { status: BookingStatus | EventStatus; endedAt?: string }) {
  if (status === 'confirmed' && endedAt && new Date(endedAt).getTime() < Date.now()) {
    return (
      <CarbonTag type="magenta" size="md">
        Did not attend
      </CarbonTag>
    )
  }
  const t = TONES[status]
  return (
    <CarbonTag type={t.type} size="md">
      {t.label}
    </CarbonTag>
  )
}

const KIND = { ok: 'success', error: 'error', warn: 'warning' } as const

export function Notice({ tone, children }: { tone: 'ok' | 'error' | 'warn'; children: React.ReactNode }) {
  return <InlineNotification lowContrast hideCloseButton kind={KIND[tone]} title="" subtitle={children as string} style={{ maxWidth: '100%' }} />
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return <SkeletonText paragraph lineCount={rows} width="100%" />
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ModeTag({ mode }: { mode?: 'physical' | 'online' }) {
  return mode === 'online' ? (
    <CarbonTag type="blue" size="sm">
      Online
    </CarbonTag>
  ) : null
}

export const CATEGORY_LABEL = { ctf: 'CTF', bootcamp: 'Bootcamp', conference: 'Conference', workshop: 'Workshop' } as const

export function SeatBar({ capacity, remaining }: { capacity: number; remaining: number }) {
  const held = Math.max(0, capacity - remaining)
  return <ProgressBar label="Seats held" hideLabel value={held} max={capacity} size="small" helperText={`${held} of ${capacity}`} />
}

export const Tag = StatusTag

export function Pager({ page, last, total, onPage }: { page: number; last: number; total: number; onPage: (p: number) => void }) {
  if (last <= 1) return <p className="pager">{total} in total</p>
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
  )
}
