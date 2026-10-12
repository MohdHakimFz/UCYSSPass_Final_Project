// Customer: the result of a booking. What is shown depends on its status:
// confirmed -> success, pending -> sandbox payment form, waitlisted -> queue position.

import { api } from '../../api.js';
import { formatDateTime, formatMoney, placeLabel, statusBadge } from '../../format.js';
import { clearAlerts, clearFieldErrors, escapeHtml, handleError, loadingHtml, setBusy, showAlert, showLoadError } from '../../ui.js';

// Statuses a customer can still cancel.
export const CANCELLABLE = ['pending', 'confirmed', 'waitlisted'];

function statusPanel(booking) {
  switch (booking.status) {
    case 'confirmed':
      return `<div class="alert alert-success mb-0">
                <strong>Booking confirmed.</strong> Your place is reserved. See you there!
              </div>`;
    case 'attended':
      return '<div class="alert alert-success mb-0">You attended this event.</div>';
    case 'waitlisted':
      return `<div class="alert alert-info mb-0">
                <strong>You are on the waitlist.</strong> This ticket is sold out.
                ${booking.waitlist_position ? `You are number ${booking.waitlist_position} in the queue.` : ''}
                You get a place automatically if someone cancels.
              </div>`;
    case 'cancelled':
      return '<div class="alert alert-secondary mb-0">This booking was cancelled.</div>';
    case 'pending': {
      const minutes = booking.hold_seconds_left ? Math.ceil(booking.hold_seconds_left / 60) : null;
      return `
        <div class="alert alert-warning">
          <strong>Payment needed.</strong> Your seat is being held
          ${minutes ? `for about ${minutes} more minute(s)` : 'for a short time'}. Pay to confirm it.
        </div>
        <form id="pay-form" class="border rounded p-3 bg-light" novalidate>
          <h2 class="h6">Sandbox payment (no real money)</h2>
          <div class="mb-3">
            <label class="form-label" for="method">Payment method</label>
            <select class="form-select" id="method" name="method">
              <option value="">Choose a method</option>
              <option value="card">Card</option>
              <option value="fpx">FPX online banking</option>
              <option value="ewallet">E-wallet</option>
            </select>
          </div>
          <button class="btn btn-success" type="submit">Pay ${escapeHtml(formatMoney(booking.ticket_type.price))}</button>
        </form>`;
    }
    default:
      return `<div class="alert alert-secondary mb-0">Status: ${escapeHtml(booking.status)}</div>`;
  }
}

export async function bookingDetailPage(container, params) {
  container.innerHTML = loadingHtml('Loading booking...');

  let booking;
  try {
    booking = await api.get(`/bookings/${params.id}`);
  } catch (error) {
    showLoadError(container, error, () => bookingDetailPage(container, params));
    return;
  }

  const tier = booking.ticket_type;
  const event = tier.event;

  container.innerHTML = `
    <a href="#/bookings" class="small">&larr; My bookings</a>
    <div class="card shadow-sm mt-2">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h1 class="h4 mb-0">${escapeHtml(event.title)}</h1>
          ${statusBadge(booking.status)}
        </div>
        <dl class="row">
          <dt class="col-sm-3">Ticket</dt><dd class="col-sm-9">${escapeHtml(tier.name)} (${escapeHtml(formatMoney(tier.price))})</dd>
          <dt class="col-sm-3">When</dt><dd class="col-sm-9">${escapeHtml(formatDateTime(event.start_at))}</dd>
          <dt class="col-sm-3">Where</dt><dd class="col-sm-9">${escapeHtml(placeLabel(event))}</dd>
          ${booking.seat ? `<dt class="col-sm-3">Seat</dt><dd class="col-sm-9">${escapeHtml(booking.seat.label)}</dd>` : ''}
          ${booking.payment ? `<dt class="col-sm-3">Payment</dt><dd class="col-sm-9">${escapeHtml(formatMoney(booking.payment.amount))} by ${escapeHtml(booking.payment.method)} ${statusBadge(booking.payment.status)}</dd>` : ''}
        </dl>
        ${statusPanel(booking)}
        ${CANCELLABLE.includes(booking.status)
          ? '<button id="cancel-btn" class="btn btn-outline-danger btn-sm mt-3" type="button">Cancel this booking</button>'
          : ''}
      </div>
    </div>`;

  // After paying or cancelling we load the booking again, so the page always
  // shows what the server really has.
  const reload = () => bookingDetailPage(container, params);

  const payForm = container.querySelector('#pay-form');
  payForm?.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    clearAlerts();
    clearFieldErrors(payForm);
    const done = setBusy(payForm.querySelector('button[type="submit"]'), 'Paying...');

    try {
      await api.post(`/bookings/${booking.id}/pay`, {
        method: payForm.elements.method.value,
        outcome: 'approve',
      });
      await reload();
      showAlert('Payment received. Your booking is confirmed.', 'success');
    } catch (error) {
      // No method chosen -> 422 under the select. Hold expired -> 409 at the top.
      handleError(error, payForm);
      done();
    }
  });

  const cancelButton = container.querySelector('#cancel-btn');
  cancelButton?.addEventListener('click', async () => {
    if (!window.confirm('Cancel this booking?')) return;
    clearAlerts();
    const done = setBusy(cancelButton, 'Cancelling...');

    try {
      await api.put(`/bookings/${booking.id}/cancel`);
      await reload();
      showAlert('Your booking was cancelled.', 'success');
    } catch (error) {
      handleError(error);
      done();
    }
  });
}
