// Organiser: dashboard numbers from GET /organiser/summary.

import { api } from '../../api.js';
import { getUser } from '../../auth.js';
import { escapeHtml, loadingHtml, showLoadError, statCardHtml } from '../../ui.js';

export function organiserDashboardPage(container) {
  container.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
      <h1 class="h3 mb-0">Welcome, ${escapeHtml(getUser().name)}</h1>
      <div>
        <a class="btn btn-outline-primary btn-sm" href="#/organiser/events">My events</a>
        <a class="btn btn-primary btn-sm" href="#/organiser/events/new">Create event</a>
      </div>
    </div>
    <div id="summary"></div>`;

  const summary = container.querySelector('#summary');

  async function load() {
    summary.innerHTML = loadingHtml('Loading your numbers...');
    try {
      const data = await api.get('/organiser/summary');
      summary.innerHTML = `
        <div class="row g-3">
          ${statCardHtml('Events', data.events)}
          ${statCardHtml('Published', data.published)}
          ${statCardHtml('Drafts', data.drafts)}
          ${statCardHtml('Upcoming', data.upcoming)}
          ${statCardHtml('Tickets sold', data.tickets_sold)}
          ${statCardHtml('Checked in', data.checked_in)}
          ${statCardHtml('Waitlisted', data.waitlisted)}
          ${statCardHtml('Net revenue', `RM ${Number(data.revenue?.net ?? 0).toFixed(2)}`)}
        </div>`;
    } catch (error) {
      showLoadError(summary, error, load);
    }
  }

  load();
}
