import { getUser } from '../auth.js';
import { escapeHtml } from '../ui.js';

// Temporary home page for a role. Each one is replaced by the real area in a
// later step; for now it proves that login and the route guard work.
export function placeholderPage(title) {
  return (container) => {
    const user = getUser();
    container.innerHTML = `
      <h1 class="h3">${escapeHtml(title)}</h1>
      <p class="text-muted">
        Logged in as ${escapeHtml(user.name)} (${escapeHtml(user.email)}), role
        <strong>${escapeHtml(user.role)}</strong>. This area is built in a later step.
      </p>`;
  };
}
