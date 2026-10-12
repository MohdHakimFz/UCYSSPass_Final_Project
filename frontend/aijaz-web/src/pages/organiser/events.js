// Organiser: "My events". Passing my own organiser_id makes the API include my drafts.

import { api } from '../../api.js';
import { getUser } from '../../auth.js';
import { categoryLabel, formatDateTime, placeLabel, statusBadge } from '../../format.js';
import { emptyHtml, escapeHtml, loadingHtml, showLoadError } from '../../ui.js';

function eventRow(event) {
  return `
    <tr>
      <td><a href="#/organiser/events/${event.id}">${escapeHtml(event.title)}</a></td>
      <td>${escapeHtml(categoryLabel(event.category))}</td>
      <td>${escapeHtml(formatDateTime(event.start_at))}</td>
      <td>${escapeHtml(placeLabel(event))}</td>
      <td>${statusBadge(event.status)}</td>
      <td class="text-end">
        <a class="btn btn-outline-primary btn-sm" href="#/organiser/events/${event.id}">Manage</a>
      </td>
    </tr>`;
}

export function organiserEventsPage(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h3 mb-0">My events</h1>
      <a class="btn btn-primary btn-sm" href="#/organiser/events/new">Create event</a>
    </div>
    <div id="event-list"></div>`;

  const list = container.querySelector('#event-list');

  async function load() {
    list.innerHTML = loadingHtml('Loading your events...');
    try {
      const result = await api.get('/events', { organiser_id: getUser().id, per_page: 50 });

      if (result.data.length === 0) {
        list.innerHTML = emptyHtml('You have not created any events yet.');
        return;
      }
      list.innerHTML = `
        <div class="table-responsive bg-white border rounded">
          <table class="table align-middle mb-0">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Starts</th><th>Where</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>${result.data.map(eventRow).join('')}</tbody>
          </table>
        </div>`;
    } catch (error) {
      showLoadError(list, error, load);
    }
  }

  load();
}
