/**
 * Case Intake Form logic
 */

function closeAllocationModal() {
  const modal = document.getElementById('allocation-modal');
  if (modal) modal.classList.remove('open');
  const form = document.getElementById('intake-form');
  if (form) form.reset();
  const counter = document.getElementById('char-counter');
  if (counter) counter.innerText = '0';
}

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth(['coordinator']);
  if (!user) return;

  renderNavbar('intake');

  const descInput = document.getElementById('description');
  const charCounter = document.getElementById('char-counter');
  if (descInput && charCounter) {
    descInput.addEventListener('input', () => {
      charCounter.innerText = descInput.value.length;
    });
  }

  const form = document.getElementById('intake-form');
  const submitBtn = document.getElementById('submit-intake-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerText = 'Allocating Case...';

      const client_name = document.getElementById('client_name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const case_type = document.getElementById('case_type').value;
      const priority = document.getElementById('priority').value;
      const description = document.getElementById('description').value.trim();

      try {
        const res = await apiRequest('/api/cases', {
          method: 'POST',
          body: JSON.stringify({
            client_name,
            phone,
            case_type,
            priority,
            description
          })
        });

        // Show allocation result modal
        const modal = document.getElementById('allocation-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMsg = document.getElementById('modal-msg');
        const modalIcon = document.getElementById('modal-icon');
        const modalDetails = document.getElementById('modal-details');

        if (res.allocated && res.case.lawyer_name) {
          modalIcon.innerText = '🎉';
          modalTitle.innerText = 'Successfully Allocated!';
          modalMsg.innerText = res.message;
          modalDetails.innerHTML = `
            <div style="margin-bottom: 0.5rem;"><strong>Case ID:</strong> #${res.case.id}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Client:</strong> ${res.case.client_name} (${res.case.phone})</div>
            <div style="margin-bottom: 0.5rem;"><strong>Assigned Lawyer:</strong> <span style="color:var(--primary); font-weight:600;">${res.case.lawyer_name}</span></div>
            <div style="margin-bottom: 0.5rem;"><strong>Category:</strong> <span style="text-transform:capitalize;">${res.case.case_type}</span></div>
            <div style="margin-bottom: 0.5rem;"><strong>Target TAT:</strong> ${res.case.target_days} Days</div>
            <div><strong>Status:</strong> <span class="badge badge-status-allocated">${res.case.status}</span></div>
          `;
        } else {
          modalIcon.innerText = '⚠️';
          modalTitle.innerText = 'Case Created (Unassigned)';
          modalMsg.innerText = 'No volunteer lawyers are currently eligible or available for this specialization.';
          modalDetails.innerHTML = `
            <div style="margin-bottom: 0.5rem;"><strong>Case ID:</strong> #${res.case.id}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Client:</strong> ${res.case.client_name}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Category:</strong> <span style="text-transform:capitalize;">${res.case.case_type}</span></div>
            <div style="margin-bottom: 0.5rem;"><strong>Target TAT:</strong> ${res.case.target_days} Days</div>
            <div><strong>Status:</strong> <span class="badge badge-status-unassigned">Unassigned</span></div>
          `;
        }

        modal.classList.add('open');
        showToast('Case submitted successfully', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = '⚡ Submit & Auto-Allocate';
      }
    });
  }
});
