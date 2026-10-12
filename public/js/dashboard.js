/**
 * Clinic Dashboard logic
 */

let loadChartInstance = null;
let statusChartInstance = null;

async function loadDashboardData() {
  try {
    const data = await apiRequest('/api/dashboard/summary');
    renderKpis(data);
    renderCharts(data);
    renderAtRiskTable(data.atRiskCases || []);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderKpis(data) {
  const counts = data.statusCounts || {};
  document.getElementById('kpi-total').innerText = counts.total || 0;
  document.getElementById('kpi-active').innerText = (counts.Allocated || 0) + (counts.Scheduled || 0);
  document.getElementById('kpi-unassigned').innerText = (counts.Unassigned || 0) + (counts.New || 0);
  document.getElementById('kpi-at-risk').innerText = data.atRiskCount || 0;
}

function renderCharts(data) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded yet');
    return;
  }

  // 1. Lawyer Workload vs Capacity Bar Chart
  const lawyerCtx = document.getElementById('lawyer-load-chart');
  if (lawyerCtx) {
    if (loadChartInstance) loadChartInstance.destroy();

    const lawyers = data.lawyerLoad || [];
    const labels = lawyers.map(l => l.name.replace('Adv. ', ''));
    const openCasesData = lawyers.map(l => l.openCases);
    const capacityData = lawyers.map(l => l.capacity);

    loadChartInstance = new Chart(lawyerCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Active Cases',
            data: openCasesData,
            backgroundColor: '#4f46e5',
            borderRadius: 6
          },
          {
            label: 'Total Capacity',
            data: capacityData,
            backgroundColor: '#cbd5e1',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  // 2. Case Status Doughnut Chart
  const statusCtx = document.getElementById('status-donut-chart');
  if (statusCtx) {
    if (statusChartInstance) statusChartInstance.destroy();

    const counts = data.statusCounts || {};
    const statusLabels = ['Allocated', 'Scheduled', 'Unassigned', 'New', 'Closed'];
    const statusData = statusLabels.map(s => counts[s] || 0);

    statusChartInstance = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [
          {
            data: statusData,
            backgroundColor: [
              '#4f46e5', // Allocated - Indigo
              '#8b5cf6', // Scheduled - Purple
              '#ef4444', // Unassigned - Red
              '#3b82f6', // New - Blue
              '#94a3b8'  // Closed - Slate
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

function renderAtRiskTable(atRiskCases) {
  const tbody = document.getElementById('at-risk-tbody');
  if (!tbody) return;

  if (atRiskCases.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; color: var(--success); padding: 2rem;">
          ✅ Excellent! No cases are currently at risk of breaching their target turnaround time.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = atRiskCases.map(c => {
    const risk = c.risk || {};
    const ratioPercent = Math.round((risk.ratio || 0) * 100);
    const isOverdue = risk.isOverdue;

    return `
      <tr>
        <td style="font-weight:700;">#${c.id}</td>
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
          ${c.lawyer_name ? `<strong>${c.lawyer_name}</strong>` : `<span style="color:var(--danger);">Unassigned</span>`}
        </td>
        <td>${c.target_days} days</td>
        <td style="font-weight:600; color:${isOverdue ? 'var(--danger)' : 'var(--warning-text)'};">
          ${risk.daysElapsed} days
        </td>
        <td>
          <span style="font-weight:700; color:${isOverdue ? 'var(--danger)' : 'var(--warning-text)'};">
            ${ratioPercent}% ${isOverdue ? '(Overdue)' : ''}
          </span>
        </td>
        <td>
          <span class="badge badge-risk-high">
            ${isOverdue ? 'OVERDUE' : 'HIGH RISK'}
          </span>
        </td>
        <td style="text-align: right;">
          <a href="/cases.html" class="btn btn-outline btn-sm">Manage</a>
        </td>
      </tr>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth(['coordinator']);
  if (!user) return;

  renderNavbar('dashboard');
  loadDashboardData();
});
