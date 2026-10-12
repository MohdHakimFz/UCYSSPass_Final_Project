// Admin: venues. List, create, edit and delete.
// One form is used for both adding and editing; editingId says which.

import { api } from '../../api.js';
import { clearAlerts, clearFieldErrors, emptyHtml, escapeHtml, handleError, loadingHtml, setBusy, showAlert, showLoadError } from '../../ui.js';

export function adminVenuesPage(container) {
  container.innerHTML = `
    <h1 class="h3 mb-3">Venues</h1>

    <form id="venue-form" class="card card-body shadow-sm mb-4" novalidate>
      <h2 class="h6" id="venue-form-title">Add a venue</h2>
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label small" for="venue-name">Name</label>
          <input class="form-control" type="text" id="venue-name" name="name" />
        </div>
        <div class="col-md-5">
          <label class="form-label small" for="venue-address">Address</label>
          <input class="form-control" type="text" id="venue-address" name="address" />
        </div>
        <div class="col-md-3">
          <label class="form-label small" for="venue-capacity">Capacity</label>
          <input class="form-control" type="number" id="venue-capacity" name="capacity" min="1" step="1" />
        </div>
      </div>
      <div class="mt-3">
        <button class="btn btn-primary btn-sm" type="submit">Add venue</button>
        <button class="btn btn-link btn-sm" type="button" id="venue-cancel" hidden>Cancel edit</button>
      </div>
    </form>

    <div id="venue-list"></div>`;

  const list = container.querySelector('#venue-list');
  const form = container.querySelector('#venue-form');
  const fields = form.elements;
  const formTitle = container.querySelector('#venue-form-title');
  const submitButton = form.querySelector('button[type="submit"]');
  const cancelButton = container.querySelector('#venue-cancel');

  let venues = [];
  // null = the form adds a new venue; a number = the form edits that venue.
  let editingId = null;

  function resetForm() {
    editingId = null;
    form.reset();
    clearFieldErrors(form);
    formTitle.textContent = 'Add a venue';
    submitButton.textContent = 'Add venue';
    cancelButton.hidden = true;
  }

  async function load() {
    list.innerHTML = loadingHtml('Loading venues...');
    try {
      const result = await api.get('/venues', { per_page: 100 });
      venues = result.data || result;

      if (venues.length === 0) {
        list.innerHTML = emptyHtml('No venues yet. Add the first one above.');
        return;
      }
      list.innerHTML = `
        <div class="table-responsive bg-white border rounded">
          <table class="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Address</th><th>Capacity</th><th></th></tr></thead>
            <tbody>
              ${venues.map((venue) => {
                // "Online" is a placeholder the API needs for online events: leave it alone.
                const system = venue.name === 'Online';
                return `
                  <tr>
                    <td>${escapeHtml(venue.name)}</td>
                    <td>${escapeHtml(venue.address)}</td>
                    <td>${venue.capacity}</td>
                    <td class="text-end text-nowrap">
                      ${system
                        ? '<span class="badge text-bg-light border">system</span>'
                        : `<button class="btn btn-outline-primary btn-sm" type="button" data-edit="${venue.id}">Edit</button>
                           <button class="btn btn-outline-danger btn-sm" type="button" data-delete="${venue.id}">Delete</button>`}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (error) {
      showLoadError(list, error, load);
    }
  }

  list.addEventListener('click', async (event) => {
    // Edit: copy the venue into the form.
    const editButton = event.target.closest('[data-edit]');
    if (editButton) {
      const venue = venues.find((item) => item.id === Number(editButton.dataset.edit));
      clearFieldErrors(form);
      editingId = venue.id;
      fields.name.value = venue.name;
      fields.address.value = venue.address;
      fields.capacity.value = venue.capacity;
      formTitle.textContent = `Edit venue "${venue.name}"`;
      submitButton.textContent = 'Save venue';
      cancelButton.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const deleteButton = event.target.closest('[data-delete]');
    if (!deleteButton) return;
    if (!window.confirm('Delete this venue?')) return;

    clearAlerts();
    const done = setBusy(deleteButton, 'Deleting...');
    try {
      await api.del(`/venues/${deleteButton.dataset.delete}`);
      resetForm();
      await load();
      showAlert('Venue deleted.', 'success');
    } catch (error) {
      // A venue that still has events gives 409, shown as a message at the top.
      handleError(error);
      done();
    }
  });

  cancelButton.addEventListener('click', resetForm);

  form.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    clearAlerts();
    clearFieldErrors(form);
    const done = setBusy(submitButton, 'Saving...');

    const body = {
      name: fields.name.value.trim(),
      address: fields.address.value.trim(),
      capacity: fields.capacity.value === '' ? '' : Number(fields.capacity.value),
    };

    try {
      if (editingId) {
        await api.put(`/venues/${editingId}`, body);
      } else {
        await api.post('/venues', body);
      }
      const message = editingId ? 'Venue saved.' : 'Venue added.';
      done();
      resetForm();
      await load();
      showAlert(message, 'success');
    } catch (error) {
      handleError(error, form);
      done();
    }
  });

  load();
}
