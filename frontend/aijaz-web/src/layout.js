// The frame around every page: navbar, "server waking up" banner, alert area
// and the <main> element that the router draws pages into.

import { getUser, logout, homeFor } from './auth.js';
import { navigate } from './router.js';
import { escapeHtml, flash } from './ui.js';

// Menu links for each role. More links are added as the pages are built.
const NAV_LINKS = {
  customer: [
    { path: '/events', label: 'Events' },
    { path: '/bookings', label: 'My bookings' },
  ],
  organiser: [
    { path: '/organiser', label: 'Dashboard' },
    { path: '/organiser/events', label: 'My events' },
  ],
  admin: [{ path: '/admin', label: 'Overview' }],
};

export function renderLayout(app) {
  app.innerHTML = `
    <nav class="navbar navbar-expand-md navbar-dark bg-dark">
      <div class="container" id="nav"></div>
    </nav>
    <div id="slow-banner" class="alert alert-info rounded-0 text-center mb-0" hidden>
      <span class="spinner-border spinner-border-sm me-2"></span>
      Waking up the server. The first request can take up to a minute...
    </div>
    <div class="container py-4">
      <div id="alerts"></div>
      <main id="view"></main>
    </div>`;
}

export function setSlowBanner(visible) {
  const banner = document.querySelector('#slow-banner');
  if (banner) banner.hidden = !visible;
}

// Redrawn on every navigation so it always matches the logged-in user and
// highlights the current page.
export function renderNav(currentPath) {
  const user = getUser();
  const nav = document.querySelector('#nav');
  const home = user ? homeFor(user.role) : '/login';

  const roleLinks = user ? NAV_LINKS[user.role] || [] : [];

  // Highlight the link that matches the current address. "/events/5" still
  // counts as "Events"; when two links match, the longer (more exact) one wins.
  const activeLink = roleLinks
    .filter((link) => currentPath === link.path || currentPath.startsWith(`${link.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];

  const links = roleLinks
    .map((link) => {
      const active = link === activeLink ? 'active' : '';
      return `<li class="nav-item"><a class="nav-link ${active}" href="#${link.path}">${link.label}</a></li>`;
    })
    .join('');

  const right = user
    ? `<span class="navbar-text me-3">
         ${escapeHtml(user.name)}
         <span class="badge text-bg-secondary ms-1">${escapeHtml(user.role)}</span>
       </span>
       <button id="logout-btn" class="btn btn-outline-light btn-sm">Log out</button>`
    : '';

  nav.innerHTML = `
    <a class="navbar-brand" href="#${home}">UCYSSPass</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav-menu"
            aria-controls="nav-menu" aria-expanded="false" aria-label="Toggle menu">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="nav-menu">
      <ul class="navbar-nav me-auto">${links}</ul>
      <div class="d-flex align-items-center">${right}</div>
    </div>`;

  nav.querySelector('#logout-btn')?.addEventListener('click', async (event) => {
    event.target.disabled = true;
    await logout();
    flash('You have been logged out.', 'success');
    navigate('/login');
  });
}
