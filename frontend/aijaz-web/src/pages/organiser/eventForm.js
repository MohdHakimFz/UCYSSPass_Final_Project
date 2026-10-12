// Organiser and admin: one form used for both "create event" and "edit event".
// With an id in the address (#/organiser/events/5/edit) it edits, without one it creates.
// An admin creating an event also chooses who owns it: an organiser, or the admin.

import { api } from '../../api.js';
import { eventsHome, getUser } from '../../auth.js';
import { CATEGORIES, fromLocalInput, toLocalInput } from '../../format.js';
import { navigate } from '../../router.js';
import { clearAlerts, clearFieldErrors, escapeHtml, flash, handleError, loadingHtml, setBusy, showAlert, showFieldErrors, showLoadError } from '../../ui.js';

const STATUSES = ['draft', 'published', 'cancelled', 'completed'];

export async function eventFormPage(container, params) {
  const editing = Boolean(params.id);
  const base = eventsHome();
  // The API only lets an admin pick the owner, and only when the event is created.
  const pickOrganiser = getUser().role === 'admin' && !editing;
  container.innerHTML = loadingHtml('Loading form...');

  let venues;
  let event = null;
  let organisers = [];
  try {
    // The requests run at the same time; we wait for all the answers.
    const [venueResult, eventResult, organiserResult] = await Promise.all([
      api.get('/venues', { per_page: 100 }),
      editing ? api.get(`/events/${params.id}`) : null,
      pickOrganiser ? api.get('/users', { role: 'organiser', per_page: 100 }) : null,
    ]);
    organisers = organiserResult?.data || [];
    // The "Online" venue is a placeholder the API uses for online events,
    // so it is not offered as a place for a physical event.
    venues = (venueResult.data || venueResult).filter((venue) => venue.name !== 'Online');
    event = eventResult;
  } catch (error) {
    showLoadError(container, error, () => eventFormPage(container, params));
    return;
  }

  const backPath = editing ? `${base}/${params.id}` : base;
  const mode = event?.mode || 'physical';
  const option = (value, label, selected) =>
    `<option value="${escapeHtml(value)}" ${selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;

  container.innerHTML = `
    <a href="#${backPath}" class="small">&larr; Back</a>
    <h1 class="h3 mt-2 mb-3">${editing ? 'Edit event' : 'Create event'}</h1>
    <form id="event-form" class="card shadow-sm" novalidate>
      <div class="card-body">
        <div class="mb-3">
          <label class="form-label" for="title">Title</label>
          <input class="form-control" type="text" id="title" name="title" value="${escapeHtml(event?.title)}" />
        </div>

        ${pickOrganiser ? `
        <div class="mb-3">
          <label class="form-label" for="organiser_id">Owner</label>
          <select class="form-select" id="organiser_id" name="organiser_id">
            <option value="">Choose who owns this event</option>
            ${option(getUser().id, `Me, ${getUser().name} (admin)`, false)}
            ${organisers.map((organiser) => option(organiser.id, `${organiser.name} (${organiser.email})`, false)).join('')}
          </select>
          <div class="form-text">The owner is the account that can manage the event. It cannot be changed later.</div>
        </div>` : ''}

        <div class="row">
          <div class="col-md-6 mb-3">
            <label class="form-label" for="category">Category</label>
            <select class="form-select" id="category" name="category">
              <option value="">Choose a category</option>
              ${Object.entries(CATEGORIES).map(([value, label]) => option(value, label, event?.category === value)).join('')}
            </select>
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label" for="status">Status</label>
            <select class="form-select" id="status" name="status">
              ${STATUSES.map((status) => option(status, status, (event?.status || 'draft') === status)).join('')}
            </select>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label d-block">Type</label>
          <div class="btn-group" role="group" data-error-anchor>
            <input class="btn-check" type="radio" name="mode" id="mode-physical" value="physical" ${mode === 'physical' ? 'checked' : ''} />
            <label class="btn btn-outline-primary" for="mode-physical">Physical</label>
            <input class="btn-check" type="radio" name="mode" id="mode-online" value="online" ${mode === 'online' ? 'checked' : ''} />
            <label class="btn btn-outline-primary" for="mode-online">Online</label>
          </div>
        </div>

        <div class="mb-3" id="venue-group">
          <label class="form-label" for="venue_id">Venue</label>
          <select class="form-select" id="venue_id" name="venue_id">
            <option value="">Choose a venue</option>
            ${venues.map((venue) => option(venue.id, `${venue.name} (capacity ${venue.capacity})`, event?.venue_id === venue.id)).join('')}
          </select>
        </div>

        <div class="mb-3" id="meeting-group">
          <label class="form-label" for="meeting_url">Meeting link</label>
          <input class="form-control" type="url" id="meeting_url" name="meeting_url"
                 placeholder="https://..." value="${escapeHtml(event?.meeting_url)}" />
          <div class="form-text">Needed before an online event can be published.</div>
        </div>

        <div class="row">
          <div class="col-md-6 mb-3">
            <label class="form-label" for="start_at">Starts</label>
            <input class="form-control" type="datetime-local" id="start_at" name="start_at" value="${toLocalInput(event?.start_at)}" />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label" for="end_at">Ends</label>
            <input class="form-control" type="datetime-local" id="end_at" name="end_at" value="${toLocalInput(event?.end_at)}" />
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label" for="description">Description</label>
          <textarea class="form-control" id="description" name="description" rows="4">${escapeHtml(event?.description)}</textarea>
        </div>

        <button class="btn btn-primary" type="submit">${editing ? 'Save changes' : 'Create event'}</button>
        <a class="btn btn-link" href="#${backPath}">Cancel</a>
      </div>
    </form>`;

  const form = container.querySelector('#event-form');
  const fields = form.elements;
  const venueGroup = container.querySelector('#venue-group');
  const meetingGroup = container.querySelector('#meeting-group');

  // Physical shows the venue dropdown, online shows the meeting link field.
  function showModeFields() {
    const online = fields.mode.value === 'online';
    venueGroup.hidden = online;
    meetingGroup.hidden = !online;
  }
  form.querySelectorAll('input[name="mode"]').forEach((radio) => radio.addEventListener('change', showModeFields));
  showModeFields();

  form.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    clearAlerts();
    clearFieldErrors(form);
    const done = setBusy(form.querySelector('button[type="submit"]'), 'Saving...');

    const body = {
      title: fields.title.value.trim(),
      category: fields.category.value,
      status: fields.status.value,
      mode: fields.mode.value,
      start_at: fromLocalInput(fields.start_at.value),
      end_at: fromLocalInput(fields.end_at.value),
      description: fields.description.value.trim() || null,
    };
    // Only send the field that belongs to the chosen type.
    if (body.mode === 'online') {
      body.meeting_url = fields.meeting_url.value.trim() || null;
    } else {
      body.venue_id = fields.venue_id.value ? Number(fields.venue_id.value) : null;
    }

    if (pickOrganiser) {
      // This one is checked here, because the API would quietly make the admin
      // the owner when no owner is sent.
      if (!fields.organiser_id.value) {
        showFieldErrors(form, { organiser_id: ['Choose an owner for this event.'] });
        showAlert('Please check the highlighted fields.');
        done();
        return;
      }
      body.organiser_id = Number(fields.organiser_id.value);
    }

    try {
      // We do not validate here: the API checks everything and its 422
      // messages are shown under each field by handleError.
      const saved = editing
        ? await api.put(`/events/${params.id}`, body)
        : await api.post('/events', body);
      flash(editing ? 'Event saved.' : 'Event created. Now add its ticket tiers below.', 'success');
      navigate(`${base}/${saved.id}`);
    } catch (error) {
      handleError(error, form);
      done();
    }
  });
}
