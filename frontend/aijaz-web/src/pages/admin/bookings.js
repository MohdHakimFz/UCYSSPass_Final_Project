// Admin: every booking in the system. For an admin, GET /bookings returns all of them.

import { api } from '../../api.js';
import { formatDateTime, formatMoney, statusBadge } from '../../format.js';
import { clearAlerts, emptyHtml, escapeHtml, loadingHtml, paginationHtml, showLoadError } from '../../ui.js';

const STATUSES = ['pending', 'confirmed', 'waitlisted', 'attended', 'cancelled'];

function bookingRow(booking) {
  const tier = booking.ticket_type;
  return `
    <tr>
      <td>
        ${escapeHtml(booking.customer?.name)}
        <div class="small text-muted">${escapeHtml(booking.customer?.email)}</div>
      </td>
      <td>${escapeHtml(tier?.event?.title)}</td>
      <td>${escapeHtml(tier?.name)}<div class="small text-muted">${escapeHtml(formatMoney(tier?.price))}</div></td>
      <td>${escapeHtml(booking.seat?.label || '-')}</td>
      <td>${escapeHtml(formatDateTime(booking.booked_at))}</td>
      <td>${statusBadge(booking.status)}</td>
    </tr>`;
}

export function adminBookingsPage(container) {
  container.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
      <h1 class="h3 mb-0">All bookings</h1>
      <select class="form-select w-auto" id="status-filter" aria-label="Status filter">
        <option value="">All statuses</option>
        ${STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('')}
      </select>
    </div>
    <div id="booking-list"></div>`;

  const filter = container.querySelector('#status-filter');
  const list = container.querySelector('#booking-list');
  let page = 1;

  async function load() {
    list.innerHTML = loadingHtml('Loading bookings...');
    try {
      const result = await api.get('/bookings', { status: filter.value, per_page: 10, page });

      if (result.data.length === 0) {
        list.innerHTML = emptyHtml('No bookings match this filter.');
        return;
      }
      list.innerHTML = `
        <div class="table-responsive bg-white border rounded">
          <table class="table align-middle mb-0">
            <thead><tr><th>Customer</th><th>Event</th><th>Ticket</th><th>Seat</th><th>Booked</th><th>Status</th></tr></thead>
            <tbody>${result.data.map(bookingRow).join('')}</tbody>
          </table>
        </div>
        ${paginationHtml(result)}`;
    } catch (error) {
      showLoadError(list, error, load);
    }
  }

  filter.addEventListener('change', () => {
    clearAlerts();
    page = 1;
    load();
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    clearAlerts();
    page = Number(button.dataset.page);
    load();
  });

  load();
}
