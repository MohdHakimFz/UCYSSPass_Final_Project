// Admin: every event from every organiser (drafts included), with Publish and Cancel.

import { api } from '../../api.js';
import { categoryLabel, formatDateTime, placeLabel, statusBadge } from '../../format.js';
import { clearAlerts, emptyHtml, escapeHtml, handleError, loadingHtml, paginationHtml, setBusy, showAlert, showLoadError } from '../../ui.js';

const STATUSES = ['draft', 'published', 'cancelled', 'completed'];

function eventRow(event) {
  return `
    <tr>
      <td>${escapeHtml(event.title)}</td>
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
      </td>
    </tr>`;
}

export function adminEventsPage(container) {
  container.innerHTML = `
    <h1 class="h3 mb-3">All events</h1>
    <form id="filter-form" class="row g-2 mb-3">
      <div class="col-md-7">
        <input class="form-control" type="search" name="search" placeholder="Search events..." aria-label="Search events" />
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

  async function load() {
    list.innerHTML = loadingHtml('Loading events...');
    try {
      const result = await api.get('/events', {
        search: form.elements.search.value.trim(),
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
            <thead><tr><th>Title</th><th>Category</th><th>Starts</th><th>Where</th><th>Status</th><th></th></tr></thead>
            <tbody>${result.data.map(eventRow).join('')}</tbody>
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
  form.elements.status.addEventListener('change', () => {
    page = 1;
    load();
  });

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

  load();
}
