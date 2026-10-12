// Admin: users. List with role filter and search, create a user, change a role, delete.

import { api } from '../../api.js';
import { getUser } from '../../auth.js';
import { clearAlerts, clearFieldErrors, emptyHtml, escapeHtml, handleError, loadingHtml, paginationHtml, setBusy, showAlert, showLoadError } from '../../ui.js';

const ROLES = ['admin', 'organiser', 'customer'];

// The whole group logs in with these accounts for their videos, so this page
// refuses to change or delete them.
const DEMO_EMAILS = ['admin@sentrypass.test', 'aisyah@ucyss.test', 'farid@ucyss.test', 'customer@sentrypass.test'];

function userRow(user) {
  // Locked rows: the shared demo accounts, and the account you are logged in with.
  const locked = DEMO_EMAILS.includes(user.email) || user.id === getUser().id;
  const roleOptions = ROLES
    .map((role) => `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role}</option>`)
    .join('');

  return `
    <tr>
      <td>
        ${escapeHtml(user.name)}
        ${locked ? '<span class="badge text-bg-light border ms-1">protected</span>' : ''}
      </td>
      <td>${escapeHtml(user.email)}</td>
      <td style="width: 160px">
        <select class="form-select form-select-sm" data-role-for="${user.id}" data-current="${escapeHtml(user.role)}"
                aria-label="Role of ${escapeHtml(user.name)}" ${locked ? 'disabled' : ''}>
          ${roleOptions}
        </select>
      </td>
      <td class="text-end">
        <button class="btn btn-outline-danger btn-sm" type="button" data-delete="${user.id}"
                data-name="${escapeHtml(user.name)}" ${locked ? 'disabled' : ''}>Delete</button>
      </td>
    </tr>`;
}

export function adminUsersPage(container) {
  const roleOptions = ROLES.map((role) => `<option value="${role}">${role}</option>`).join('');

  container.innerHTML = `
    <h1 class="h3 mb-3">Users</h1>

    <form id="user-form" class="card card-body shadow-sm mb-4" novalidate>
      <h2 class="h6">Create a user</h2>
      <div class="row g-2">
        <div class="col-md-3">
          <label class="form-label small" for="user-name">Name</label>
          <input class="form-control" type="text" id="user-name" name="name" />
        </div>
        <div class="col-md-3">
          <label class="form-label small" for="user-email">Email</label>
          <input class="form-control" type="email" id="user-email" name="email" autocomplete="off" />
        </div>
        <div class="col-md-3">
          <label class="form-label small" for="user-password">Password (min 8)</label>
          <input class="form-control" type="password" id="user-password" name="password" autocomplete="new-password" />
        </div>
        <div class="col-md-3">
          <label class="form-label small" for="user-role">Role</label>
          <select class="form-select" id="user-role" name="role">
            <option value="">Choose a role</option>
            ${roleOptions}
          </select>
        </div>
      </div>
      <div class="mt-3">
        <button class="btn btn-primary btn-sm" type="submit">Create user</button>
      </div>
    </form>

    <form id="filter-form" class="row g-2 mb-3">
      <div class="col-md-7">
        <input class="form-control" type="search" name="search" placeholder="Search by name or email..." aria-label="Search users" />
      </div>
      <div class="col-md-3">
        <select class="form-select" name="role" aria-label="Role filter">
          <option value="">All roles</option>
          ${roleOptions}
        </select>
      </div>
      <div class="col-md-2">
        <button class="btn btn-outline-primary w-100" type="submit">Search</button>
      </div>
    </form>
    <div id="user-list"></div>`;

  const createForm = container.querySelector('#user-form');
  const filterForm = container.querySelector('#filter-form');
  const list = container.querySelector('#user-list');
  let page = 1;

  async function load() {
    list.innerHTML = loadingHtml('Loading users...');
    try {
      const result = await api.get('/users', {
        search: filterForm.elements.search.value.trim(),
        role: filterForm.elements.role.value,
        per_page: 10,
        page,
      });

      if (result.data.length === 0) {
        list.innerHTML = emptyHtml('No users match this filter.');
        return;
      }
      list.innerHTML = `
        <div class="table-responsive bg-white border rounded">
          <table class="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>${result.data.map(userRow).join('')}</tbody>
          </table>
        </div>
        ${paginationHtml(result)}`;
    } catch (error) {
      showLoadError(list, error, load);
    }
  }

  // ---- Filter ----
  filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearAlerts();
    page = 1;
    load();
  });
  filterForm.elements.role.addEventListener('change', () => {
    page = 1;
    load();
  });

  // ---- Create ----
  createForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlerts();
    clearFieldErrors(createForm);
    const done = setBusy(createForm.querySelector('button[type="submit"]'), 'Creating...');
    const fields = createForm.elements;

    try {
      const user = await api.post('/users', {
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        password: fields.password.value,
        role: fields.role.value,
      });
      createForm.reset();
      await load();
      showAlert(`User "${user.name}" created as ${user.role}.`, 'success');
    } catch (error) {
      // e.g. 422 "The email has already been taken." under the email box.
      handleError(error, createForm);
    }
    done();
  });

  // ---- Change role: saved as soon as another role is picked ----
  list.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-role-for]');
    if (!select) return;

    clearAlerts();
    select.disabled = true;
    try {
      const user = await api.put(`/users/${select.dataset.roleFor}`, { role: select.value });
      select.dataset.current = user.role;
      showAlert(`${user.name} is now ${user.role}.`, 'success');
    } catch (error) {
      // Put the dropdown back to the role the user really has.
      select.value = select.dataset.current;
      handleError(error);
    }
    select.disabled = false;
  });

  // ---- Paging and delete ----
  list.addEventListener('click', async (event) => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) {
      clearAlerts();
      page = Number(pageButton.dataset.page);
      load();
      return;
    }

    const deleteButton = event.target.closest('[data-delete]');
    if (!deleteButton) return;
    if (!window.confirm(`Delete user "${deleteButton.dataset.name}"? This cannot be undone.`)) return;

    clearAlerts();
    const done = setBusy(deleteButton, 'Deleting...');
    try {
      await api.del(`/users/${deleteButton.dataset.delete}`);
      await load();
      showAlert('User deleted.', 'success');
    } catch (error) {
      handleError(error);
      done();
    }
  });

  load();
}
