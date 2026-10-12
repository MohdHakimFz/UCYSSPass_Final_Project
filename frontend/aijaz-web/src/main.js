import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { api } from './api.js';

// Step 1 only: a temporary page that proves the app can reach the API.
// It is replaced by the real router and pages in the next step.
const app = document.querySelector('#app');

app.innerHTML = `
  <div class="container py-5" style="max-width: 640px">
    <h1 class="h3 mb-3">UCYSSPass</h1>
    <div class="card">
      <div class="card-body">
        <h2 class="h6 text-muted">API connection test</h2>
        <p id="status" class="mb-0">
          <span class="spinner-border spinner-border-sm me-2"></span>Contacting the API...
        </p>
      </div>
    </div>
  </div>
`;

const status = document.querySelector('#status');

try {
  // GET /venues is public, so it works without logging in.
  const venues = await api.get('/venues');
  const list = Array.isArray(venues) ? venues : venues.data;
  status.className = 'mb-0 text-success';
  status.textContent = `Connected. The API returned ${list.length} venue(s).`;
} catch (error) {
  status.className = 'mb-0 text-danger';
  status.textContent = `${error.message} (status ${error.status})`;
}
