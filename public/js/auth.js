/**
 * Login & Auth handling
 */

function fillCredentials(email, password) {
  document.getElementById('email').value = email;
  document.getElementById('password').value = password;
  const alertEl = document.getElementById('error-alert');
  if (alertEl) alertEl.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  const user = getUser();
  if (user) {
    window.location.href = user.role === 'coordinator' ? '/dashboard.html' : '/cases.html';
    return;
  }

  const form = document.getElementById('login-form');
  const alertEl = document.getElementById('error-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertEl.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerText = 'Signing in...';

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const data = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        saveAuth(data.token, data.user);

        if (data.user.role === 'coordinator') {
          window.location.href = '/dashboard.html';
        } else {
          window.location.href = '/cases.html';
        }
      } catch (err) {
        alertEl.innerText = err.message || 'Login failed. Please verify credentials.';
        alertEl.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Sign In';
      }
    });
  }
});
