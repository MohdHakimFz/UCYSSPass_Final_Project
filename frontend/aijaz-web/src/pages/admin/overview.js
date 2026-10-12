// Admin: overview numbers from GET /admin/stats.

import { api } from '../../api.js';
import { formatDateTime, statusBadge } from '../../format.js';
import { emptyHtml, escapeHtml, loadingHtml, showLoadError, statCardHtml } from '../../ui.js';

const money = (value) => `RM ${Number(value ?? 0).toFixed(2)}`;

// Turns an object such as { draft: 10, published: 34 } into a small card with one row per key.
function breakdownCard(title, counts = {}) {
  const rows = Object.entries(counts)
    .map(([name, count]) => `
      <li class="list-group-item d-flex justify-content-between">
        <span class="text-capitalize">${escapeHtml(name)}</span>
        <span class="fw-semibold">${escapeHtml(count)}</span>
      </li>`)
    .join('');

  return `
    <div class="col-md-4">
      <div class="card shadow-sm h-100">
        <div class="card-header bg-white fw-semibold">${escapeHtml(title)}</div>
        <ul class="list-group list-group-flush">
          ${rows || '<li class="list-group-item text-muted">Nothing yet</li>'}
        </ul>
      </div>
    </div>`;
}

function activityTable(activity = []) {
  if (activity.length === 0) return emptyHtml('No recent activity.');
  return `
    <div class="table-responsive bg-white border rounded">
      <table class="table align-middle mb-0">
        <thead><tr><th>Customer</th><th>Event</th><th>Ticket</th><th>Status</th><th>When</th></tr></thead>
        <tbody>
          ${activity.map((item) => `
            <tr>
              <td>${escapeHtml(item.customer)}</td>
              <td>${escapeHtml(item.event)}</td>
              <td>${escapeHtml(item.tier)}</td>
              <td>${statusBadge(item.status)}</td>
              <td>${escapeHtml(formatDateTime(item.at))}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

export function adminOverviewPage(container) {
  container.innerHTML = `
    <h1 class="h3 mb-3">Overview</h1>
    <div id="stats"></div>`;

  const stats = container.querySelector('#stats');

  async function load() {
    stats.innerHTML = loadingHtml('Loading statistics...');
    try {
      const data = await api.get('/admin/stats');
      stats.innerHTML = `
        <div class="row g-3 mb-3">
          ${statCardHtml('Net revenue', money(data.revenue?.net))}
          ${statCardHtml('Gross revenue', money(data.revenue?.gross))}
          ${statCardHtml('Refunded', money(data.revenue?.refunded))}
          ${statCardHtml('Draft events', data.draft_events ?? 0)}
        </div>
        <div class="row g-3 mb-4">
          ${breakdownCard('Users by role', data.users_by_role)}
          ${breakdownCard('Events by status', data.events_by_status)}
          ${breakdownCard('Bookings by status', data.bookings_by_status)}
        </div>
        <h2 class="h5">Recent activity</h2>
        ${activityTable(data.recent_activity)}`;
    } catch (error) {
      showLoadError(stats, error, load);
    }
  }

  load();
}
