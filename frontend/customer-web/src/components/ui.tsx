import { CheckCircle, Warning, WarningCircle } from '@phosphor-icons/react'
import type { BookingStatus, EventStatus } from '../lib/api'

const TONES: Record<string, { tone: string; label: string }> = {
  confirmed: { tone: 'cleared', label: 'Confirmed' },
  published: { tone: 'cleared', label: 'Published' },
  waitlisted: { tone: 'held', label: 'Waitlisted' },
  pending: { tone: 'held', label: 'Pending' },
  draft: { tone: 'held', label: 'Draft' },
  cancelled: { tone: 'revoked', label: 'Cancelled' },
  attended: { tone: 'attended', label: 'Checked in' },
  completed: { tone: 'attended', label: 'Completed' },
}

export function Tag({ status }: { status: BookingStatus | EventStatus }) {
  const t = TONES[status]
  return (
    <span className="tag" data-tone={t.tone}>
      {t.label}
    </span>
  )
}

export function Notice({ tone, children }: { tone: 'ok' | 'error' | 'warn'; children: React.ReactNode }) {
  const Icon = tone === 'ok' ? CheckCircle : tone === 'error' ? WarningCircle : Warning
  return (
    <div className="notice" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={20} weight="bold" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  )
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

export const CATEGORY_LABEL = { ctf: 'CTF', bootcamp: 'Bootcamp', conference: 'Conference', workshop: 'Workshop' } as const
