/**
 * Cases page logic
 */

let allCases = [];
let allLawyers = [];
let currentUser = null;

function computeRisk(caseItem) {
  if (caseItem.status === 'Closed') {
    return { level: 'Closed', badgeClass: 'badge-status-closed', label: 'Closed' };
  }

  const created = new Date(caseItem.created_at);
  const now = new Date();
  const diffMs = now - created;
  const daysElapsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const targetDays = caseItem.target_days || 14;
  const ratio = daysElapsed / targetDays;

  if (ratio < 0.5) {
    return { level: 'Low', badgeClass: 'badge-risk-low', label: 'Low Risk', daysElapsed, targetDays };
  } else if (ratio < 0.8) {
    return { level: 'Medium', badgeClass: 'badge-risk-medium', label: 'Medium Risk', daysElapsed, targetDays };
  } else {
    return { level: 'High', badgeClass: 'badge-risk-high', label: 'High Risk (At-Risk)', daysElapsed, targetDays };
  }
}

async function loadCases() {
  try {
    const data = await apiRequest('/api/cases');
    allCases = data.cases || [];
    renderCasesTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadLawyers() {
  if (currentUser.role !== 'coordinator') return;
  try {
    const data = await apiRequest('/api/lawyers');
    allLawyers = data.lawyers || [];
    populateLawyersDropdown();
  } catch (err) {
    console.error('Failed to load lawyers for override modal:', err);
  }
}

function populateLawyersDropdown() {
  const select = document.getElementById('override-lawyer-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- Unassign Case --</option>';
  for (const l of allLawyers) {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.innerText = `${l.name} (${l.openCases}/${l.capacity} active) [${l.specializations.join(', ')}]`;
    select.appendChild(opt);
  }
}

function renderCasesTable() {
  const tbody = document.getElementById('cases-tbody');
  if (!tbody) return;

  const search = document.getElementById('search-input').value.toLowerCase().trim();
  const filterType = document.getElementById('filter-type').value;
  const filterStatus = document.getElementById('filter-status').value;
  const filterPriority = document.getElementById('filter-priority').value;

  const filtered = allCases.filter(c => {
    if (filterType && c.case_type !== filterType) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterPriority && c.priority !== filterPriority) return false;
    if (search) {
      const matchName = c.client_name && c.client_name.toLowerCase().includes(search);
      const matchDesc = c.description && c.description.toLowerCase().includes(search);
      const matchLawyer = c.lawyer_name && c.lawyer_name.toLowerCase().includes(search);
      if (!matchName && !matchDesc && !matchLawyer) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; color:var(--text-muted); padding:2.5rem;">
          No matching cases found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const risk = computeRisk(c);
    const createdDate = new Date(c.created_at).toLocaleDateString();
    const consultationStr = c.consultation_at
      ? `<span style="font-weight:600; color:var(--primary); font-size:0.8rem;">📅 ${new Date(c.consultation_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>`
      : `<span style="color:var(--text-dim); font-size:0.8rem;">None</span>`;

    const lawyerDisplay = c.lawyer_name
      ? `<strong style="color:var(--text-main);">${c.lawyer_name}</strong>`
      : `<span style="color:var(--danger); font-style:italic;">Unassigned</span>`;

    const isCoord = currentUser.role === 'coordinator';

    return `
      <tr>
        <td style="font-weight:700; color:var(--text-muted);">#${c.id}</td>
        <td>
          <div style="font-weight:600;">${c.client_name}</div>
          <div style="font-size:0.775rem; color:var(--text-muted);">${c.phone}</div>
        </td>
        <td>
          <span class="chip" style="text-transform:capitalize;">${c.case_type}</span>
        </td>
        <td>
          <span class="badge badge-priority-${c.priority.toLowerCase()}">${c.priority}</span>
        </td>
        <td>
          <span class="badge badge-status-${c.status.toLowerCase()}">${c.status}</span>
        </td>
        <td>${lawyerDisplay}</td>
        <td>
          <span style="font-size:0.85rem;">${risk.daysElapsed !== undefined ? `${risk.daysElapsed}d / ${risk.targetDays}d` : '-'}</span>
        </td>
        <td>
          <span class="badge ${risk.badgeClass}">${risk.label}</span>
        </td>
        <td>${consultationStr}</td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display:inline-flex; gap:0.35rem;">
            ${isCoord ? `
              <button onclick="openOverrideModal(${c.id}, ${c.lawyer_id || 'null'})" class="btn btn-outline btn-sm" title="Reassign Lawyer">
                🔄 Reassign
              </button>
            ` : ''}
            <button onclick="openScheduleModal(${c.id})" class="btn btn-outline btn-sm" title="Book Consultation">
              📅 Schedule
            </button>
            <button onclick="openStatusModal(${c.id}, '${c.status}')" class="btn btn-outline btn-sm" title="Change Status">
              ⚙️ Status
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Override modal actions
function openOverrideModal(caseId, currentLawyerId) {
  document.getElementById('override-case-id').value = caseId;
  const select = document.getElementById('override-lawyer-select');
  if (select) {
    select.value = currentLawyerId !== null ? currentLawyerId : '';
  }
  document.getElementById('override-modal').classList.add('open');
}

function closeOverrideModal() {
  document.getElementById('override-modal').classList.remove('open');
}

async function submitOverride() {
  const caseId = document.getElementById('override-case-id').value;
  const lawyerIdVal = document.getElementById('override-lawyer-select').value;
  const lawyer_id = lawyerIdVal ? parseInt(lawyerIdVal, 10) : null;

  try {
    await apiRequest(`/api/cases/${caseId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ lawyer_id })
    });
    showToast('Assignment updated successfully', 'success');
    closeOverrideModal();
    loadCases();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Schedule modal actions
function openScheduleModal(caseId) {
  document.getElementById('schedule-case-id').value = caseId;
  const dateInput = document.getElementById('consultation-datetime');
  // Default to tomorrow 10:00 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  dateInput.value = tomorrow.toISOString().slice(0, 16);

  document.getElementById('schedule-modal').classList.add('open');
}

function closeScheduleModal() {
  document.getElementById('schedule-modal').classList.remove('open');
}

async function submitSchedule() {
  const caseId = document.getElementById('schedule-case-id').value;
  const consultation_at = document.getElementById('consultation-datetime').value;

  if (!consultation_at) {
    showToast('Please select date and time', 'error');
    return;
  }

  try {
    await apiRequest(`/api/cases/${caseId}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify({ consultation_at })
    });
    showToast('Consultation scheduled successfully', 'success');
    closeScheduleModal();
    loadCases();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Status modal actions
function openStatusModal(caseId, currentStatus) {
  document.getElementById('status-case-id').value = caseId;
  const select = document.getElementById('update-status-select');
  if (select) select.value = currentStatus;
  document.getElementById('status-modal').classList.add('open');
}

function closeStatusModal() {
  document.getElementById('status-modal').classList.remove('open');
}

async function submitStatusUpdate() {
  const caseId = document.getElementById('status-case-id').value;
  const status = document.getElementById('update-status-select').value;

  try {
    await apiRequest(`/api/cases/${caseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    showToast('Status updated successfully', 'success');
    closeStatusModal();
    loadCases();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  currentUser = requireAuth();
  if (!currentUser) return;

  renderNavbar('cases');

  if (currentUser.role === 'lawyer') {
    const intakeBtn = document.getElementById('intake-btn-container');
    if (intakeBtn) intakeBtn.style.display = 'none';

    const titleText = document.getElementById('page-title-text');
    if (titleText) titleText.innerText = 'My Assigned Cases';

    const subtitleText = document.getElementById('page-subtitle-text');
    if (subtitleText) subtitleText.innerText = 'Cases currently allocated to your volunteer roster.';
  }

  // Setup search & filter listeners
  document.getElementById('search-input').addEventListener('input', renderCasesTable);
  document.getElementById('filter-type').addEventListener('change', renderCasesTable);
  document.getElementById('filter-status').addEventListener('change', renderCasesTable);
  document.getElementById('filter-priority').addEventListener('change', renderCasesTable);

  loadCases();
  loadLawyers();
});
