/**
 * Lawyers Roster logic
 */

let lawyersList = [];
let currentUser = null;

async function loadLawyers() {
  try {
    const data = await apiRequest('/api/lawyers');
    lawyersList = data.lawyers || [];
    renderLawyersGrid();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderLawyersGrid() {
  const container = document.getElementById('lawyers-grid');
  if (!container) return;

  if (lawyersList.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">
        No volunteer lawyers registered yet.
      </div>
    `;
    return;
  }

  const isCoord = currentUser.role === 'coordinator';

  container.innerHTML = lawyersList.map(l => {
    const loadPercent = Math.min(100, Math.round((l.openCases / l.capacity) * 100));
    let fillClass = '';
    if (loadPercent >= 90) fillClass = 'danger';
    else if (loadPercent >= 60) fillClass = 'warning';

    const availBadge = l.available
      ? `<span class="badge badge-risk-low">Active / Available</span>`
      : `<span class="badge badge-risk-high">On Leave / Inactive</span>`;

    const specsHtml = l.specializations.length > 0
      ? l.specializations.map(s => `<span class="chip" style="text-transform:capitalize;">${s}</span>`).join('')
      : `<span style="color:var(--text-dim); font-size:0.75rem;">None specified</span>`;

    return `
      <div class="lawyer-card">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main);">${l.name}</h3>
              <p style="font-size:0.85rem; color:var(--text-muted);">${l.email}</p>
            </div>
            ${availBadge}
          </div>

          <div style="margin-bottom:1rem;">
            <div style="font-size:0.75rem; font-weight:600; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.35rem;">
              Specializations
            </div>
            <div>${specsHtml}</div>
          </div>

          <div style="margin-bottom:1.25rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
              <span style="font-weight:600; color:var(--text-main);">Current Workload</span>
              <span style="font-weight:700; color:${loadPercent >= 90 ? 'var(--danger)' : 'var(--text-main)'};">
                ${l.openCases} / ${l.capacity} cases (${loadPercent}%)
              </span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${fillClass}" style="width: ${loadPercent}%;"></div>
            </div>
          </div>
        </div>

        ${isCoord ? `
          <div style="display:flex; gap:0.5rem; justify-content:flex-end; border-top:1px solid var(--border); padding-top:1rem;">
            <button onclick="toggleAvailability(${l.id}, ${l.available})" class="btn btn-outline btn-sm">
              ${l.available ? 'Mark On Leave' : 'Mark Available'}
            </button>
            <button onclick="promptEditCapacity(${l.id}, ${l.capacity})" class="btn btn-outline btn-sm">
              Adjust Capacity
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function toggleAvailability(lawyerId, currentAvail) {
  try {
    await apiRequest(`/api/lawyers/${lawyerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ available: !currentAvail })
    });
    showToast('Lawyer availability updated', 'success');
    loadLawyers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function promptEditCapacity(lawyerId, currentCapacity) {
  const newCap = prompt('Enter new maximum capacity for this lawyer:', currentCapacity);
  if (newCap === null) return;
  const num = parseInt(newCap, 10);
  if (isNaN(num) || num <= 0) {
    showToast('Please enter a valid positive number', 'error');
    return;
  }

  try {
    await apiRequest(`/api/lawyers/${lawyerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ capacity: num })
    });
    showToast('Capacity updated', 'success');
    loadLawyers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openAddLawyerModal() {
  document.getElementById('add-lawyer-modal').classList.add('open');
}

function closeAddLawyerModal() {
  document.getElementById('add-lawyer-modal').classList.remove('open');
  const form = document.getElementById('add-lawyer-form');
  if (form) form.reset();
}

document.addEventListener('DOMContentLoaded', () => {
  currentUser = requireAuth();
  if (!currentUser) return;

  renderNavbar('lawyers');

  if (currentUser.role !== 'coordinator') {
    const addBtn = document.getElementById('add-lawyer-btn');
    if (addBtn) addBtn.style.display = 'none';
  }

  const form = document.getElementById('add-lawyer-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-lawyer-btn');
      saveBtn.disabled = true;

      const name = document.getElementById('new-lawyer-name').value.trim();
      const email = document.getElementById('new-lawyer-email').value.trim();
      const capacity = parseInt(document.getElementById('new-lawyer-capacity').value, 10);

      const checkboxes = document.querySelectorAll('input[name="spec"]:checked');
      const specializations = Array.from(checkboxes).map(cb => cb.value);

      try {
        await apiRequest('/api/lawyers', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            capacity,
            specializations,
            available: true
          })
        });
        showToast('Volunteer lawyer registered successfully', 'success');
        closeAddLawyerModal();
        loadLawyers();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  loadLawyers();
});
