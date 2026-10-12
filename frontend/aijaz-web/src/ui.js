// Small helpers shared by every page: safe HTML, alerts, loading and empty
// states, and showing API errors.

// Text from the API (names, titles...) must be escaped before it is put into
// an HTML string, otherwise a title like "<script>" would run as code.
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ---- Alerts at the top of the page ----

// type is a Bootstrap colour: 'danger', 'warning', 'success' or 'info'.
export function showAlert(message, type = 'danger') {
  const box = document.querySelector('#alerts');
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function clearAlerts() {
  document.querySelector('#alerts').innerHTML = '';
}

// A "flash" is an alert that should appear on the NEXT page, e.g. after a
// redirect. The router shows it once the new page is on screen.
let pendingFlash = null;

export function flash(message, type = 'info') {
  pendingFlash = { message, type };
}

export function showPendingFlash() {
  if (!pendingFlash) return;
  showAlert(pendingFlash.message, pendingFlash.type);
  pendingFlash = null;
}

// ---- Loading and empty states ----

export function loadingHtml(text = 'Loading...') {
  return `
    <div class="text-center text-muted py-5">
      <div class="spinner-border mb-2" role="status"></div>
      <div>${escapeHtml(text)}</div>
    </div>`;
}

export function emptyHtml(text) {
  return `<div class="text-center text-muted border rounded bg-white py-5">${escapeHtml(text)}</div>`;
}

// Previous / Next buttons for a paginated API result ({ current_page, last_page, total }).
// The page listens for clicks on [data-page] to load the other page.
export function paginationHtml(result) {
  if (result.last_page <= 1) return '';
  const page = result.current_page;
  return `
    <div class="d-flex justify-content-between align-items-center mt-3">
      <button class="btn btn-outline-secondary btn-sm" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      <span class="text-muted small">Page ${page} of ${result.last_page} (${result.total} in total)</span>
      <button class="btn btn-outline-secondary btn-sm" data-page="${page + 1}" ${page >= result.last_page ? 'disabled' : ''}>Next</button>
    </div>`;
}

// When a list or page fails to load: show the message at the top AND put a
// "Try again" block where the content would be, so the page is never blank.
export function showLoadError(element, error, retry) {
  handleError(error);
  element.innerHTML = `
    <div class="text-center border rounded bg-white py-5">
      <p class="text-muted">This could not be loaded.</p>
      <button class="btn btn-outline-primary btn-sm" type="button">Try again</button>
    </div>`;
  element.querySelector('button').addEventListener('click', retry);
}

// One number on a dashboard.
export function statCardHtml(label, value) {
  return `
    <div class="col-6 col-md-3">
      <div class="card shadow-sm h-100">
        <div class="card-body">
          <div class="small text-muted">${escapeHtml(label)}</div>
          <div class="fs-3 fw-semibold">${escapeHtml(value)}</div>
        </div>
      </div>
    </div>`;
}

// Disables a button and shows a spinner while a request is running, so the
// user cannot submit the same form twice. Returns a function that undoes it.
export function setBusy(button, busyText = 'Please wait...') {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${escapeHtml(busyText)}`;
  return () => {
    button.disabled = false;
    button.innerHTML = original;
  };
}

// ---- Errors ----

export function clearFieldErrors(form) {
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  form.querySelectorAll('.invalid-feedback').forEach((el) => el.remove());
}

// Puts each 422 message in red under the input whose name matches the field.
// Returns the messages that had no matching input, so they are not lost.
export function showFieldErrors(form, errors) {
  const leftover = [];
  for (const [field, messages] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) {
      leftover.push(...messages);
      continue;
    }
    input.classList.add('is-invalid');
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback d-block';
    feedback.textContent = messages.join(' ');
    // Grouped inputs (radio buttons, checkboxes) get the message after the whole group.
    (input.closest('[data-error-anchor]') || input).after(feedback);
  }
  return leftover;
}

// The one function pages call in a catch block.
// Pass the form when the request came from a form, so 422 errors go under the fields.
export function handleError(error, form = null) {
  // Anything that is not an ApiError is a bug in our own code: log it for the
  // developer, but still show the user a normal sentence.
  if (error?.name !== 'ApiError') {
    console.error(error);
    showAlert('Something went wrong. Please try again.');
    return;
  }

  // A dead token: api.js has already cleared it and sent the user to login.
  if (error.status === 401 && !form) return;

  if (error.status === 422 && form) {
    const leftover = showFieldErrors(form, error.errors);
    showAlert(leftover.length ? leftover.join(' ') : 'Please check the highlighted fields.');
    return;
  }

  // 403, 404, 409, 429, 5xx and network errors: friendly message at the top.
  showAlert(error.message, error.status === 429 ? 'warning' : 'danger');
}
