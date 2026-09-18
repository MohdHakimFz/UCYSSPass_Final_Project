import type { Booking } from './api'

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Build a calendar file for a confirmed booking so the event lands in the customer's own calendar app.
export function downloadIcs(b: Booking) {
  const ev = b.ticket_type?.event
  if (!ev) return

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SentryPass//Pass//EN',
    'BEGIN:VEVENT',
    `UID:booking-${b.id}@sentrypass`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(ev.start_at)}`,
    `DTEND:${stamp(ev.end_at)}`,
    `SUMMARY:${esc(ev.title)}`,
    `LOCATION:${esc(ev.venue?.name ?? '')}`,
    `DESCRIPTION:${esc(`${b.ticket_type?.name} pass. Show your QR code at the door.`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
