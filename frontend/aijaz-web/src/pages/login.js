import { login, homeFor } from '../auth.js';
import { navigate } from '../router.js';
import { clearAlerts, clearFieldErrors, handleError, setBusy } from '../ui.js';

export function loginPage(container) {
  container.innerHTML = `
    <div class="mx-auto" style="max-width: 420px">
      <div class="card shadow-sm">
        <div class="card-body p-4">
          <h1 class="h4 mb-3">Log in</h1>
          <form id="login-form" novalidate>
            <div class="mb-3">
              <label class="form-label" for="email">Email</label>
              <input class="form-control" type="email" id="email" name="email" autocomplete="username" />
            </div>
            <div class="mb-3">
              <label class="form-label" for="password">Password</label>
              <input class="form-control" type="password" id="password" name="password" autocomplete="current-password" />
            </div>
            <button class="btn btn-primary w-100" type="submit">Log in</button>
          </form>
          <p class="text-center mt-3 mb-0">
            New here? <a href="#/register">Create a customer account</a>
          </p>
        </div>
      </div>
    </div>`;

  const form = container.querySelector('#login-form');

  form.addEventListener('submit', async (event) => {
    // Stop the browser from reloading the page; we send the request ourselves.
    event.preventDefault();
    clearAlerts();
    clearFieldErrors(form);
    const done = setBusy(form.querySelector('button[type="submit"]'), 'Logging in...');

    try {
      const fields = form.elements;
      const user = await login(fields.email.value.trim(), fields.password.value);
      navigate(homeFor(user.role));
    } catch (error) {
      // 422 (empty fields) goes under the inputs, 401 (wrong password) goes on top.
      handleError(error, form);
      done();
    }
  });
}
