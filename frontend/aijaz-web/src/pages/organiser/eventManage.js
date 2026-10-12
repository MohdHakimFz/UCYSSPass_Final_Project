// Organiser and admin: the page for one event. Shows its details, the Publish / Move back
// to draft buttons, its ticket tiers and its bookings.

import { api } from '../../api.js';
import { eventsHome, getUser } from '../../auth.js';
import { categoryLabel, formatDateTime, placeLabel, statusBadge } from '../../format.js';
import { navigate } from '../../router.js';
import { clearAlerts, escapeHtml, flash, handleError, loadingHtml, setBusy, showAlert, showLoadError } from '../../ui.js';
import { mountEventBookings } from './eventBookings.js';
import { mountTiers } from './tiers.js';

export async function eventManagePage(container, params) {
  container.innerHTML = loadingHtml('Loading event...');
  const base = eventsHome();

  let event;
  try {
    event = await api.get(`/events/${params.id}`);
  } catch (error) {
    showLoadError(container, error, () => eventManagePage(container, params));
    return;
  }

  const where = event.mode === 'online'
    ? `Online${event.meeting_url ? ` (${event.meeting_url})` : ' (no meeting link yet)'}`
    : placeLabel(event);

  container.innerHTML = `
    <a href="#${base}" class="small">&larr; ${getUser().role === 'admin' ? 'All events' : 'My events'}</a>
    <div class="card shadow-sm mt-2 mb-4">
      <div class="card-body">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
          <h1 class="h3 mb-0">${escapeHtml(event.title)}</h1>
          ${statusBadge(event.status)}
        </div>
        <dl class="row mb-3">
          <dt class="col-sm-2">Category</dt><dd class="col-sm-10">${escapeHtml(categoryLabel(event.category))}</dd>
          <dt class="col-sm-2">Starts</dt><dd class="col-sm-10">${escapeHtml(formatDateTime(event.start_at))}</dd>
          <dt class="col-sm-2">Ends</dt><dd class="col-sm-10">${escapeHtml(formatDateTime(event.end_at))}</dd>
          <dt class="col-sm-2">Where</dt><dd class="col-sm-10">${escapeHtml(where)}</dd>
          <dt class="col-sm-2">About</dt><dd class="col-sm-10">${escapeHtml(event.description || 'No description yet.')}</dd>
        </dl>
        <div class="d-flex flex-wrap gap-2">
          <a class="btn btn-outline-primary btn-sm" href="#${base}/${event.id}/edit">Edit details</a>
          ${event.status !== 'published'
            ? '<button class="btn btn-success btn-sm" type="button" data-status="published">Publish</button>'
            : ''}
          ${event.status !== 'draft'
            ? '<button class="btn btn-outline-secondary btn-sm" type="button" data-status="draft">Move back to draft</button>'
            : ''}
          <button class="btn btn-outline-danger btn-sm ms-auto" type="button" id="delete-btn">Delete event</button>
        </div>
      </div>
    </div>
    <section id="tiers" class="mb-4"></section>
    <section id="event-bookings"></section>`;

  mountTiers(container.querySelector('#tiers'), event.id);
  mountEventBookings(container.querySelector('#event-bookings'), event.id);

  // Publish and "Move back to draft" are the same request with a different status.
  container.querySelectorAll('[data-status]').forEach((button) => {
    button.addEventListener('click', async () => {
      const status = button.dataset.status;
      clearAlerts();
      const done = setBusy(button);
      try {
        await api.put(`/events/${event.id}`, { status });
        await eventManagePage(container, params);
        showAlert(status === 'published' ? 'Event published.' : 'Event moved back to draft.', 'success');
      } catch (error) {
        // e.g. 403 when this is another organiser's event, or 422 when an
        // online event has no meeting link yet.
        handleError(error);
        done();
      }
    });
  });

  const deleteButton = container.querySelector('#delete-btn');
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    clearAlerts();
    const done = setBusy(deleteButton, 'Deleting...');
    try {
      await api.del(`/events/${event.id}`);
      flash('Event deleted.', 'success');
      navigate(base);
    } catch (error) {
      handleError(error);
      done();
    }
  });
}
