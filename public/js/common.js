/**
 * Nayra Connect - Shared Frontend Utilities
 */

const STORAGE_TOKEN_KEY = 'nayra_token';
const STORAGE_USER_KEY = 'nayra_user';

function getToken() {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
}

function getUser() {
  const raw = localStorage.getItem(STORAGE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveAuth(token, user) {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

function logout() {
  clearAuth();
  window.location.href = '/login.html';
}

function requireAuth(allowedRoles = null) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    clearAuth();
    window.location.href = '/login.html';
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    alert('Access restricted: your role does not have permission to view this page.');
    window.location.href = user.role === 'coordinator' ? '/dashboard.html' : '/cases.html';
    return null;
  }

  return user;
}

async function apiRequest(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearAuth();
    if (window.location.pathname !== '/login.html') {
      window.location.href = '/login.html';
    }
  }

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function renderNavbar(activePage = '') {
  const navPlaceholder = document.getElementById('navbar-container');
  if (!navPlaceholder) return;

  const user = getUser();
  const isCoord = user && user.role === 'coordinator';

  let navLinksHtml = '';
  if (isCoord) {
    navLinksHtml = `
      <li><a href="/dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a></li>
      <li><a href="/intake.html" class="nav-link ${activePage === 'intake' ? 'active' : ''}">New Intake</a></li>
      <li><a href="/cases.html" class="nav-link ${activePage === 'cases' ? 'active' : ''}">All Cases</a></li>
      <li><a href="/lawyers.html" class="nav-link ${activePage === 'lawyers' ? 'active' : ''}">Lawyers</a></li>
    `;
  } else {
    navLinksHtml = `
      <li><a href="/cases.html" class="nav-link ${activePage === 'cases' ? 'active' : ''}">My Cases</a></li>
    `;
  }

  navPlaceholder.innerHTML = `
    <nav class="navbar">
      <div class="nav-container">
        <a href="${isCoord ? '/dashboard.html' : '/cases.html'}" class="nav-brand">
          <div class="brand-icon">⚖️</div>
          <span>Nayra Connect</span>
        </a>
        <ul class="nav-links">
          ${navLinksHtml}
        </ul>
        <div class="nav-user">
          ${user ? `
            <div class="user-badge">
              <span style="font-weight:600;">${user.name}</span>
              <span class="role-tag role-${user.role}">${user.role}</span>
            </div>
            <button onclick="logout()" class="btn btn-outline btn-sm">Logout</button>
          ` : `
            <a href="/login.html" class="btn btn-primary btn-sm">Login</a>
          `}
        </div>
      </div>
    </nav>
  `;
}
