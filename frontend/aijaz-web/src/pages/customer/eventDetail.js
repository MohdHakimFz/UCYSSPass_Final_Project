// Customer: one event with its ticket tiers and a Book button per tier.

import { api } from '../../api.js';
import { categoryLabel, formatDateTime, formatMoney, placeLabel } from '../../format.js';
import { navigate } from '../../router.js';
import { clearAlerts, clearFieldErrors, emptyHtml, escapeHtml, handleError, loadingHtml, setBusy, showLoadError } from '../../ui.js';

// Each tier is its own small form, so a 422 for seat_id lands under that tier's seat box.
function tierHtml(tier, event, ended) {
  const soldOut = tier.seats_remaining <= 0;
  const seatPicker = event.seated && !soldOut
    ? `<div class="mt-2">
         <label class="form-label small mb-1" for="seat-${tier.id}">Seat</label>
         <select class="form-select form-select-sm" id="seat-${tier.id}" name="seat_id">
           <option value="">Loading seats...</option>
         </select>
       </div>`
    : '';

  return `
    <form class="list-group-item py-3" data-tier="${tier.id}" novalidate>
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <div class="fw-semibold">
            ${escapeHtml(tier.name)}
            ${tier.members_only ? '<span class="badge text-bg-warning ms-1">Members only</span>' : ''}
          </div>
          <div class="small text-muted">
            ${escapeHtml(formatMoney(tier.price))} &middot;
            ${soldOut ? 'Sold out' : `${tier.seats_remaining} of ${tier.capacity} seats remaining`}
          </div>
        </div>
        <button class="btn ${soldOut ? 'btn-outline-secondary' : 'btn-primary'} btn-sm" type="submit" ${ended ? 'disabled' : ''}>
          ${soldOut ? 'Join waitlist' : 'Book'}
        </button>
      </div>
      ${seatPicker}
    </form>`;
}

// Seated events: fill the seat box of one tier with the seats that are still free.
async function loadSeats(select, tierId) {
  try {
    const seats = await api.get(`/ticket-types/${tierId}/seats`);
    const free = seats.filter((seat) => !seat.taken);
    select.innerHTML =
      '<option value="">Choose a seat</option>' +
      free.map((seat) => `<option value="${seat.id}">${escapeHtml(seat.label)}</option>`).join('');
  } catch {
    select.innerHTML = '<option value="">Seats could not be loaded</option>';
  }
}

export async function eventDetailPage(container, params) {
  container.innerHTML = loadingHtml('Loading event...');

  let event;
  try {
    event = await api.get(`/events/${params.id}`);
  } catch (error) {
    showLoadError(container, error, () => eventDetailPage(container, params));
    return;
  }

  const ended = new Date(event.end_at) < new Date();
  const tiers = event.ticket_types || [];
  const where = event.mode === 'online'
    ? 'Online'
    : `${placeLabel(event)}${event.venue?.address ? `, ${event.venue.address}` : ''}`;

  container.innerHTML = `
    <a href="#/events" class="small">&larr; Back to events</a>
    <div class="card shadow-sm mt-2 mb-4">
      <div class="card-body">
        <span class="badge text-bg-primary mb-2">${escapeHtml(categoryLabel(event.category))}</span>
        <h1 class="h3">${escapeHtml(event.title)}</h1>
        <dl class="row mb-0">
          <dt class="col-sm-2">Starts</dt><dd class="col-sm-10">${escapeHtml(formatDateTime(event.start_at))}</dd>
          <dt class="col-sm-2">Ends</dt><dd class="col-sm-10">${escapeHtml(formatDateTime(event.end_at))}</dd>
          <dt class="col-sm-2">Where</dt><dd class="col-sm-10">${escapeHtml(where)}</dd>
          <dt class="col-sm-2">About</dt><dd class="col-sm-10">${escapeHtml(event.description || 'No description yet.')}</dd>
        </dl>
      </div>
    </div>

    <h2 class="h5">Tickets</h2>
    ${ended ? '<div class="alert alert-secondary">This event has ended, so booking is closed.</div>' : ''}
    ${tiers.length === 0
      ? emptyHtml('No tickets are on sale for this event yet.')
      : `<div class="list-group shadow-sm">${tiers.map((tier) => tierHtml(tier, event, ended)).join('')}</div>`}`;

  container.querySelectorAll('form[data-tier]').forEach((form) => {
    const tierId = Number(form.dataset.tier);
    const seatSelect = form.querySelector('select[name="seat_id"]');
    if (seatSelect) loadSeats(seatSelect, tierId);

    form.addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault();
      clearAlerts();
      clearFieldErrors(form);
      const done = setBusy(form.querySelector('button[type="submit"]'), 'Booking...');

      try {
        const body = { ticket_type_id: tierId };
        if (seatSelect?.value) body.seat_id = Number(seatSelect.value);

        // The API decides the result: confirmed (free), pending (paid) or waitlisted (sold out).
        const booking = await api.post('/bookings', body);
        navigate(`/bookings/${booking.id}`);
      } catch (error) {
        handleError(error, form);
        done();
      }
    });
  });
}
