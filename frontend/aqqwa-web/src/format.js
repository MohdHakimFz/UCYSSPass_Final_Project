// Small helpers for showing API values to people.

export const CATEGORIES = [
  { value: 'ctf', label: 'CTF' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
]

export function categoryLabel(value) {
  const found = CATEGORIES.find((c) => c.value === value)
  return found ? found.label : value
}

export function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatPrice(value) {
  const amount = Number(value || 0)
  return amount === 0 ? 'Free' : 'RM ' + amount.toFixed(2)
}

export function formatMoney(value) {
  return 'RM ' + Number(value || 0).toFixed(2)
}

// API date -> value for <input type="datetime-local"> (local time, no seconds).
export function toInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes())
  )
}

// <input type="datetime-local"> value -> ISO string for the API (empty stays empty, so the API says "required").
export function fromInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

const BADGE_COLOURS = {
  confirmed: 'green',
  published: 'green',
  attended: 'blue',
  pending: 'yellow',
  draft: 'yellow',
  waitlisted: 'purple',
  cancelled: 'red',
  completed: 'grey',
  admin: 'red',
  organiser: 'blue',
  customer: 'green',
}

export function badgeClass(status) {
  return 'badge badge-' + (BADGE_COLOURS[status] || 'grey')
}
