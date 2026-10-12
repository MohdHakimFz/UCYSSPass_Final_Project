// Customer: browse published events, with search, category filter and paging.

import { api } from '../../api.js';
import { CATEGORIES, categoryLabel, formatDateTime, formatMoney, placeLabel } from '../../format.js';
import { clearAlerts, emptyHtml, escapeHtml, loadingHtml, paginationHtml, showLoadError } from '../../ui.js';

function eventCard(event) {
  const seats = event.seats_remaining > 0 ? `${event.seats_remaining} seats left` : 'Sold out';
  return `
    <div class="col-md-6 col-lg-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body d-flex flex-column">
          <div class="mb-2">
            <span class="badge text-bg-primary">${escapeHtml(categoryLabel(event.category))}</span>
          </div>
          <h2 class="h5 card-title">${escapeHtml(event.title)}</h2>
          <ul class="list-unstyled small text-muted mb-3">
            <li>${escapeHtml(formatDateTime(event.start_at))}</li>
            <li>${escapeHtml(placeLabel(event))}</li>
            <li>From ${escapeHtml(formatMoney(event.from_price))} &middot; ${escapeHtml(seats)}</li>
          </ul>
          <a class="btn btn-outline-primary btn-sm mt-auto" href="#/events/${event.id}">View details</a>
        </div>
      </div>
    </div>`;
}

export function eventsPage(container) {
  const categoryOptions = Object.entries(CATEGORIES)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');

  container.innerHTML = `
    <h1 class="h3 mb-3">Events</h1>
    <form id="filter-form" class="row g-2 mb-4">
      <div class="col-md-7">
        <input class="form-control" type="search" name="search" placeholder="Search events..." aria-label="Search events" />
      </div>
      <div class="col-md-3">
        <select class="form-select" name="category" aria-label="Category">
          <option value="">All categories</option>
          ${categoryOptions}
        </select>
      </div>
      <div class="col-md-2">
        <button class="btn btn-primary w-100" type="submit">Search</button>
      </div>
    </form>
    <div id="event-list"></div>`;

  const form = container.querySelector('#filter-form');
  const list = container.querySelector('#event-list');
  let page = 1;
  // Counts requests so that a slow, older answer never replaces a newer one.
  let latestRequest = 0;

  async function load() {
    latestRequest += 1;
    const thisRequest = latestRequest;
    list.innerHTML = loadingHtml('Loading events...');

    try {
      const result = await api.get('/events', {
        search: form.elements.search.value.trim(),
        category: form.elements.category.value,
        status: 'published',
        per_page: 9,
        page,
      });
      if (thisRequest !== latestRequest) return;

      if (result.data.length === 0) {
        list.innerHTML = emptyHtml('No events match your search.');
        return;
      }
      list.innerHTML = `
        <div class="row g-3">${result.data.map(eventCard).join('')}</div>
        ${paginationHtml(result)}`;
    } catch (error) {
      if (thisRequest !== latestRequest) return;
      showLoadError(list, error, load);
    }
  }

  // A new search or filter always starts again from page 1.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearAlerts();
    page = 1;
    load();
  });
  form.elements.category.addEventListener('change', () => {
    page = 1;
    load();
  });

  // One listener on the list handles every Previous / Next button inside it.
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button) return;
    clearAlerts();
    page = Number(button.dataset.page);
    load();
  });

  load();
}
