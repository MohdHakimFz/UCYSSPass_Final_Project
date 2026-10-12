// Customer: "My bookings". The API already returns only this customer's bookings.

import { api } from '../../api.js';
import { formatDateTime, formatMoney, statusBadge } from '../../format.js';
import { clearAlerts, emptyHtml, escapeHtml, handleError, loadingHtml, paginationHtml, setBusy, showAlert, showLoadError } from '../../ui.js';
import { CANCELLABLE } from './bookingDetail.js';

function bookingRow(booking) {
  const tier = booking.ticket_type;
  const event = tier.event;
  const actions = [
    booking.status === 'pending'
      ? `<a class="btn btn-success btn-sm" href="#/bookings/${booking.id}">Pay now</a>`
      : '',
    CANCELLABLE.includes(booking.status)
      ? `<button class="btn btn-outline-danger btn-sm" type="button" data-cancel="${booking.id}">Cancel</button>`
      : '',
  ].join(' ');

  return `
    <tr>
      <td><a href="#/bookings/${booking.id}">${escapeHtml(event.title)}</a></td>
      <td>${escapeHtml(tier.name)}<div class="small text-muted">${escapeHtml(formatMoney(tier.price))}</div></td>
      <td>${escapeHtml(formatDateTime(event.start_at))}</td>
      <td>${escapeHtml(booking.seat?.label || '-')}</td>
      <td>${statusBadge(booking.status)}</td>
      <td class="text-end text-nowrap">${actions}</td>
    </tr>`;
}

export function bookingsPage(container) {
  container.innerHTML = `
    <h1 class="h3 mb-3">My bookings</h1>
    <div id="booking-list"></div>`;

  const list = container.querySelector('#booking-list');
  let page = 1;

  async function load() {
    list.innerHTML = loadingHtml('Loading your bookings...');
    try {
      const result = await api.get('/bookings', { per_page: 10, page });

      if (result.data.length === 0) {
        list.innerHTML = `
          ${emptyHtml('You have no bookings yet.')}
          <p class="text-center mt-3"><a href="#/events">Browse events</a></p>`;
        return;
      }
      list.innerHTML = `
        <div class="table-responsive bg-white border rounded">
          <table class="table align-middle mb-0">
            <thead>
              <tr><th>Event</th><th>Ticket</th><th>Starts</th><th>Seat</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>${result.data.map(bookingRow).join('')}</tbody>
          </table>
        </div>
        ${paginationHtml(result)}`;
    } catch (error) {
      showLoadError(list, error, load);
    }
  }

  // One listener handles the paging buttons and every Cancel button in the table.
  list.addEventListener('click', async (event) => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) {
      clearAlerts();
      page = Number(pageButton.dataset.page);
      load();
      return;
    }

    const cancelButton = event.target.closest('[data-cancel]');
    if (!cancelButton) return;
    if (!window.confirm('Cancel this booking?')) return;

    clearAlerts();
    const done = setBusy(cancelButton, 'Cancelling...');
    try {
      await api.put(`/bookings/${cancelButton.dataset.cancel}/cancel`);
      await load();
      showAlert('Your booking was cancelled.', 'success');
    } catch (error) {
      handleError(error);
      done();
    }
  });

  load();
}
