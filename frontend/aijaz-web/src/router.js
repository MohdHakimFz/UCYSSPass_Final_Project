// Hand-written hash router.
// The part of the URL after "#" (e.g. "#/events/5") decides which page to draw.
// Changing the hash never reloads the page; the browser fires "hashchange"
// and we draw the matching page into <main id="view">.

import { getUser, homeFor } from './auth.js';
import { renderNav } from './layout.js';
import { clearAlerts, flash, showPendingFlash, handleError } from './ui.js';

let routes = [];

// Compares a route pattern such as "/events/:id" with the real path "/events/5".
// Returns the params ({ id: "5" }) when they match, or null when they do not.
function match(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function currentPath() {
  // "#/events/5" -> "/events/5". An empty hash counts as "/".
  return window.location.hash.slice(1) || '/';
}

// Go to another page. If we are already on it, redraw it.
export function navigate(path) {
  if (currentPath() === path) {
    handleRoute();
  } else {
    window.location.hash = `#${path}`;
  }
}

async function handleRoute() {
  // Nothing to draw until startRouter has been called.
  if (routes.length === 0) return;

  const path = currentPath();
  const user = getUser();

  let route = null;
  let params = null;
  for (const candidate of routes) {
    params = match(candidate.path, path);
    if (params) {
      route = candidate;
      break;
    }
  }

  // ---- Route guard ----
  // Unknown address: go to your own home, or to login when logged out.
  if (!route) {
    navigate(user ? homeFor(user.role) : '/login');
    return;
  }
  // Login and register are only for logged-out visitors.
  if (route.guest && user) {
    navigate(homeFor(user.role));
    return;
  }
  // Every other page needs a login.
  if (!route.guest && !user) {
    navigate('/login');
    return;
  }
  // A page that belongs to another role: back to your own home.
  if (route.role && route.role !== user.role) {
    flash('That page is not available for your account, so we brought you back here.', 'warning');
    navigate(homeFor(user.role));
    return;
  }

  clearAlerts();
  renderNav(path);
  showPendingFlash();

  // Each visit gets a brand new container. If the user clicks away while a
  // page is still loading, the old page keeps writing into its old container,
  // which is no longer on screen, so it cannot overwrite the new page.
  const container = document.createElement('div');
  document.querySelector('#view').replaceChildren(container);

  try {
    await route.page(container, params);
  } catch (error) {
    handleError(error);
  }
}

export function startRouter(routeTable) {
  routes = routeTable;
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
