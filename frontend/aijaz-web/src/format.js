// Turns raw API values into text for the screen.

import { escapeHtml } from './ui.js';

export const CATEGORIES = {
  ctf: 'CTF',
  bootcamp: 'Bootcamp',
  conference: 'Conference',
  workshop: 'Workshop',
};

export function categoryLabel(category) {
  return CATEGORIES[category] || category;
}

// "2026-09-07T22:00:00.000000Z" -> "8 Sept 2026, 6:00 am" in the visitor's own time zone.
export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
}

// The API sends prices as text such as "15.00".
export function formatMoney(value) {
  const amount = Number(value);
  return amount === 0 ? 'Free' : `RM ${amount.toFixed(2)}`;
}

// Bootstrap colour for each event or booking status.
const STATUS_COLOURS = {
  confirmed: 'success',
  attended: 'success',
  published: 'success',
  paid: 'success',
  pending: 'warning',
  waitlisted: 'info',
  draft: 'secondary',
  completed: 'secondary',
  cancelled: 'danger',
  refunded: 'dark',
  failed: 'danger',
};

export function statusBadge(status) {
  const colour = STATUS_COLOURS[status] || 'secondary';
  return `<span class="badge text-bg-${colour}">${escapeHtml(status)}</span>`;
}

// "Cyber Range Lab" for a physical event, "Online" for an online one.
export function placeLabel(event) {
  if (event.mode === 'online') return 'Online';
  return event.venue?.name || 'Venue to be confirmed';
}
