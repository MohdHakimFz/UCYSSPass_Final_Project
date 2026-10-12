import { register, homeFor } from '../auth.js';
import { navigate } from '../router.js';
import { clearAlerts, clearFieldErrors, flash, handleError, setBusy } from '../ui.js';

export function registerPage(container) {
  container.innerHTML = `
    <div class="mx-auto" style="max-width: 420px">
      <div class="card shadow-sm">
        <div class="card-body p-4">
          <h1 class="h4 mb-3">Create a customer account</h1>
          <form id="register-form" novalidate>
            <div class="mb-3">
              <label class="form-label" for="name">Name</label>
              <input class="form-control" type="text" id="name" name="name" autocomplete="name" />
            </div>
            <div class="mb-3">
              <label class="form-label" for="email">Email</label>
              <input class="form-control" type="email" id="email" name="email" autocomplete="username" />
            </div>
            <div class="mb-3">
              <label class="form-label" for="password">Password</label>
              <input class="form-control" type="password" id="password" name="password" autocomplete="new-password" />
            </div>
            <div class="mb-3">
              <label class="form-label" for="password_confirmation">Confirm password</label>
              <input class="form-control" type="password" id="password_confirmation" name="password_confirmation" autocomplete="new-password" />
            </div>
            <button class="btn btn-primary w-100" type="submit">Create account</button>
          </form>
          <p class="text-center mt-3 mb-0">
            Already have an account? <a href="#/login">Log in</a>
          </p>
        </div>
      </div>
    </div>`;

  const form = container.querySelector('#register-form');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlerts();
    clearFieldErrors(form);
    const done = setBusy(form.querySelector('button[type="submit"]'), 'Creating account...');

    try {
      // We do not check the fields ourselves: the API validates them and its
      // 422 messages are shown under each input by handleError.
      const fields = form.elements;
      const user = await register({
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        password: fields.password.value,
        password_confirmation: fields.password_confirmation.value,
      });
      flash(`Welcome, ${user.name}! Your account is ready.`, 'success');
      navigate(homeFor(user.role));
    } catch (error) {
      handleError(error, form);
      done();
    }
  });
}
