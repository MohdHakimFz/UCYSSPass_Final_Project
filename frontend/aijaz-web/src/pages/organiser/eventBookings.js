// The "Bookings" section of an event page: GET /bookings?event_id=<id>.

import { api } from '../../api.js';
import { formatDateTime, statusBadge } from '../../format.js';
import { emptyHtml, escapeHtml, loadingHtml, paginationHtml, showLoadError } from '../../ui.js';

export function mountEventBookings(section, eventId) {
  section.innerHTML = `
    <h2 class="h5">Bookings for this event</h2>
    <div id="event-booking-list"></div>`;

  const list = section.querySelector('#event-booking-list');
  let page = 1;

  async function load() {
    list.innerHTML = loadingHtml('Loading bookings...');
    try {
      const result = await api.get('/bookings', { event_id: eventId, per_page: 10, page });

      if (result.data.length === 0) {
        list.innerHTML = emptyHtml('Nobody has booked this event yet.');
        return;
      }
      list.innerHTML = `
        <div class="table-responsive bg-white border rounded">
          <table class="table align-middle mb-0">
            <thead><tr><th>Customer</th><th>Ticket</th><th>Seat</th><th>Booked</th><th>Status</th></tr></thead>
            <tbody>
              ${result.data.map((booking) => `
                <tr>
                  <td>
                    ${escapeHtml(booking.customer?.name)}
                    <div class="small text-muted">${escapeHtml(booking.customer?.email)}</div>
                  </td>
                  <td>${escapeHtml(booking.ticket_type?.name)}</td>
                  <td>${escapeHtml(booking.seat?.label || '-')}</td>
                  <td>${escapeHtml(formatDateTime(booking.booked_at))}</td>
                  <td>${statusBadge(booking.status)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${paginationHtml(result)}`;
    } catch (error) {
      showLoadError(list, error, load);
    }
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    page = Number(button.dataset.page);
    load();
  });

  load();
}
