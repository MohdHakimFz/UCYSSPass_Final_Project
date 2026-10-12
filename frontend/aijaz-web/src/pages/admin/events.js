// Admin: every event from every organiser (drafts included). The admin can
// create an event for any organiser, publish or cancel from the list, and open
// any event to edit it, manage its ticket tiers, see its bookings or delete it.

import { api } from '../../api.js';
import { categoryLabel, formatDateTime, placeLabel, statusBadge } from '../../format.js';
import { clearAlerts, emptyHtml, escapeHtml, handleError, loadingHtml, paginationHtml, setBusy, showAlert, showLoadError } from '../../ui.js';

const STATUSES = ['draft', 'published', 'cancelled', 'completed'];

function eventRow(event, organiserNames) {
  return `
    <tr>
      <td><a href="#/admin/events/${event.id}">${escapeHtml(event.title)}</a></td>
      <td>${escapeHtml(organiserNames[event.organiser_id] || '-')}</td>
      <td>${escapeHtml(categoryLabel(event.category))}</td>
      <td>${escapeHtml(formatDateTime(event.start_at))}</td>
      <td>${escapeHtml(placeLabel(event))}</td>
      <td>${statusBadge(event.status)}</td>
      <td class="text-end text-nowrap">
        ${event.status !== 'published'
          ? `<button class="btn btn-success btn-sm" type="button" data-event="${event.id}" data-status="published">Publish</button>`
          : ''}
        ${event.status !== 'cancelled'
          ? `<button class="btn btn-outline-danger btn-sm" type="button" data-event="${event.id}" data-status="cancelled">Cancel</button>`
          : ''}
        <a class="btn btn-outline-primary btn-sm" href="#/admin/events/${event.id}">Manage</a>
      </td>
    </tr>`;
}

export function adminEventsPage(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h3 mb-0">All events</h1>
      <a class="btn btn-primary btn-sm" href="#/admin/events/new">Create event</a>
    </div>
    <form id="filter-form" class="row g-2 mb-3">
      <div class="col-md-4">
        <input class="form-control" type="search" name="search" placeholder="Search events..." aria-label="Search events" />
      </div>
      <div class="col-md-3">
        <select class="form-select" name="organiser_id" aria-label="Organiser filter">
          <option value="">All organisers</option>
        </select>
      </div>
      <div class="col-md-3">
        <select class="form-select" name="status" aria-label="Status filter">
          <option value="">All statuses</option>
          ${STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('')}
        </select>
      </div>
      <div class="col-md-2">
        <button class="btn btn-outline-primary w-100" type="submit">Search</button>
      </div>
    </form>
    <div id="event-list"></div>`;

  const form = container.querySelector('#filter-form');
  const list = container.querySelector('#event-list');
  let page = 1;
  // { 3: "Nurul Aisyah", ... } so the table can show a name instead of an id.
  const organiserNames = {};

  // Events only carry organiser_id, so the names come from the users list.
  // If this fails the page still works, just without names and the filter.
  async function loadOrganisers() {
    try {
      const result = await api.get('/users', { role: 'organiser', per_page: 100 });
      for (const organiser of result.data) {
        organiserNames[organiser.id] = organiser.name;
        form.elements.organiser_id.add(new Option(organiser.name, organiser.id));
      }
    } catch {
      form.elements.organiser_id.disabled = true;
    }
  }

  async function load() {
    list.innerHTML = loadingHtml('Loading events...');
    try {
      const result = await api.get('/events', {
        search: form.elements.search.value.trim(),
        organiser_id: form.elements.organiser_id.value,
        status: form.elements.status.value,
        per_page: 10,
        page,
      });

      if (result.data.length === 0) {
        list.innerHTML = emptyHtml('No events match this filter.');
        return;
      }
      list.innerHTML = `
        <div class="table-responsive bg-white border rounded">
          <table class="table align-middle mb-0">
            <thead><tr><th>Title</th><th>Organiser</th><th>Category</th><th>Starts</th><th>Where</th><th>Status</th><th></th></tr></thead>
            <tbody>${result.data.map((event) => eventRow(event, organiserNames)).join('')}</tbody>
          </table>
        </div>
        ${paginationHtml(result)}`;
    } catch (error) {
      showLoadError(list, error, load);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearAlerts();
    page = 1;
    load();
  });
  for (const name of ['status', 'organiser_id']) {
    form.elements[name].addEventListener('change', () => {
      page = 1;
      load();
    });
  }

  list.addEventListener('click', async (event) => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) {
      clearAlerts();
      page = Number(pageButton.dataset.page);
      load();
      return;
    }

    // Publish and Cancel are the same request with a different status.
    const statusButton = event.target.closest('[data-status]');
    if (!statusButton) return;
    const status = statusButton.dataset.status;
    if (status === 'cancelled' && !window.confirm('Cancel this event?')) return;

    clearAlerts();
    const done = setBusy(statusButton);
    try {
      await api.put(`/events/${statusButton.dataset.event}`, { status });
      await load();
      showAlert(status === 'published' ? 'Event published.' : 'Event cancelled.', 'success');
    } catch (error) {
      handleError(error);
      done();
    }
  });

  // Names first, so the first table already shows them.
  loadOrganisers().then(load);
}
