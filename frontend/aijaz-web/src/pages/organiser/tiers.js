// The "Ticket tiers" section of an event page: list, add, edit and delete.
// One form is used for both adding and editing; editingId says which.

import { api } from '../../api.js';
import { formatMoney } from '../../format.js';
import { clearAlerts, clearFieldErrors, emptyHtml, escapeHtml, handleError, loadingHtml, setBusy, showAlert, showLoadError } from '../../ui.js';

export function mountTiers(section, eventId) {
  section.innerHTML = `
    <h2 class="h5">Ticket tiers</h2>
    <div id="tier-list" class="mb-3"></div>
    <form id="tier-form" class="card card-body shadow-sm" novalidate>
      <h3 class="h6" id="tier-form-title">Add a tier</h3>
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label small" for="tier-name">Name</label>
          <input class="form-control" type="text" id="tier-name" name="name" placeholder="e.g. Standard" />
        </div>
        <div class="col-md-3">
          <label class="form-label small" for="tier-price">Price (RM, 0 = free)</label>
          <input class="form-control" type="number" id="tier-price" name="price" min="0" step="0.01" />
        </div>
        <div class="col-md-3">
          <label class="form-label small" for="tier-capacity">Capacity</label>
          <input class="form-control" type="number" id="tier-capacity" name="capacity" min="0" step="1" />
        </div>
        <div class="col-md-2 d-flex align-items-end">
          <div class="form-check mb-2" data-error-anchor>
            <input class="form-check-input" type="checkbox" id="tier-members" name="members_only" />
            <label class="form-check-label small" for="tier-members">Members only</label>
          </div>
        </div>
      </div>
      <div class="mt-3">
        <button class="btn btn-primary btn-sm" type="submit">Add tier</button>
        <button class="btn btn-link btn-sm" type="button" id="tier-cancel" hidden>Cancel edit</button>
      </div>
    </form>`;

  const list = section.querySelector('#tier-list');
  const form = section.querySelector('#tier-form');
  const fields = form.elements;
  const formTitle = section.querySelector('#tier-form-title');
  const submitButton = form.querySelector('button[type="submit"]');
  const cancelButton = section.querySelector('#tier-cancel');

  let tiers = [];
  // null = the form adds a new tier; a number = the form edits that tier.
  let editingId = null;

  function resetForm() {
    editingId = null;
    form.reset();
    clearFieldErrors(form);
    formTitle.textContent = 'Add a tier';
    submitButton.textContent = 'Add tier';
    cancelButton.hidden = true;
  }

  async function load() {
    list.innerHTML = loadingHtml('Loading tiers...');
    try {
      tiers = await api.get(`/events/${eventId}/ticket-types`);

      if (tiers.length === 0) {
        list.innerHTML = emptyHtml('No ticket tiers yet. Add the first one below.');
        return;
      }
      list.innerHTML = `
        <div class="table-responsive bg-white border rounded">
          <table class="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Price</th><th>Capacity</th><th>Seats left</th><th></th></tr></thead>
            <tbody>
              ${tiers.map((tier) => `
                <tr>
                  <td>
                    ${escapeHtml(tier.name)}
                    ${tier.members_only ? '<span class="badge text-bg-warning ms-1">Members only</span>' : ''}
                  </td>
                  <td>${escapeHtml(formatMoney(tier.price))}</td>
                  <td>${tier.capacity}</td>
                  <td>${tier.seats_remaining}</td>
                  <td class="text-end text-nowrap">
                    <button class="btn btn-outline-primary btn-sm" type="button" data-edit="${tier.id}">Edit</button>
                    <button class="btn btn-outline-danger btn-sm" type="button" data-delete="${tier.id}">Delete</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (error) {
      showLoadError(list, error, load);
    }
  }

  list.addEventListener('click', async (event) => {
    // Edit: copy the tier into the form.
    const editButton = event.target.closest('[data-edit]');
    if (editButton) {
      const tier = tiers.find((item) => item.id === Number(editButton.dataset.edit));
      clearFieldErrors(form);
      editingId = tier.id;
      fields.name.value = tier.name;
      fields.price.value = tier.price;
      fields.capacity.value = tier.capacity;
      fields.members_only.checked = tier.members_only;
      formTitle.textContent = `Edit tier "${tier.name}"`;
      submitButton.textContent = 'Save tier';
      cancelButton.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const deleteButton = event.target.closest('[data-delete]');
    if (!deleteButton) return;
    if (!window.confirm('Delete this ticket tier?')) return;

    clearAlerts();
    const done = setBusy(deleteButton, 'Deleting...');
    try {
      await api.del(`/ticket-types/${deleteButton.dataset.delete}`);
      resetForm();
      await load();
      showAlert('Tier deleted.', 'success');
    } catch (error) {
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

    // Empty number boxes are sent as "" so the API answers "required" for them.
    const body = {
      name: fields.name.value.trim(),
      price: fields.price.value === '' ? '' : Number(fields.price.value),
      capacity: fields.capacity.value === '' ? '' : Number(fields.capacity.value),
      members_only: fields.members_only.checked,
    };

    try {
      if (editingId) {
        await api.put(`/ticket-types/${editingId}`, body);
      } else {
        await api.post(`/events/${eventId}/ticket-types`, body);
      }
      const message = editingId ? 'Tier saved.' : 'Tier added.';
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
