/**
 * Student Management System - Frontend Application Logic
 */

// Application State
const state = {
  students: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  },
  filters: {
    search: '',
    department: 'All',
    status: 'All',
    sortBy: 'id',
    order: 'DESC'
  },
  editingStudentId: null,
  deletingStudentId: null,
  theme: localStorage.getItem('theme') || 'light'
};

// DOM Elements
const elements = {
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  statTotalStudents: document.getElementById('stat-total-students'),
  statActiveStudents: document.getElementById('stat-active-students'),
  statAverageGpa: document.getElementById('stat-avg-gpa'),
  statDepartments: document.getElementById('stat-departments'),
  searchInput: document.getElementById('search-input'),
  deptFilter: document.getElementById('dept-filter'),
  statusFilter: document.getElementById('status-filter'),
  sortByFilter: document.getElementById('sort-by-filter'),
  sortOrderBtn: document.getElementById('sort-order-btn'),
  studentsTableBody: document.getElementById('students-table-body'),
  emptyState: document.getElementById('empty-state'),
  tableCard: document.getElementById('table-card'),
  paginationInfo: document.getElementById('pagination-info'),
  prevPageBtn: document.getElementById('prev-page-btn'),
  nextPageBtn: document.getElementById('next-page-btn'),
  pageNumbersContainer: document.getElementById('page-numbers-container'),
  deptAnalyticsList: document.getElementById('dept-analytics-list'),
  toastContainer: document.getElementById('toast-container'),
  
  // Modals
  studentModal: document.getElementById('student-modal'),
  studentModalTitle: document.getElementById('student-modal-title'),
  studentForm: document.getElementById('student-form'),
  openAddModalBtn: document.getElementById('open-add-modal-btn'),
  closeStudentModalBtn: document.getElementById('close-student-modal-btn'),
  cancelStudentModalBtn: document.getElementById('cancel-student-modal-btn'),
  
  viewModal: document.getElementById('view-modal'),
  closeViewModalBtn: document.getElementById('close-view-modal-btn'),
  viewDetailsContainer: document.getElementById('view-details-container'),
  
  deleteModal: document.getElementById('delete-modal'),
  closeDeleteModalBtn: document.getElementById('close-delete-modal-btn'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
  deleteTargetName: document.getElementById('delete-target-name'),

  // Tools
  exportCsvBtn: document.getElementById('export-csv-btn'),
  exportJsonBtn: document.getElementById('export-json-btn'),
  resetDemoBtn: document.getElementById('reset-demo-btn'),
  avatarPreviewImg: document.getElementById('avatar-preview-img'),
  refreshAvatarBtn: document.getElementById('refresh-avatar-btn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  setupEventListeners();
  loadStats();
  loadStudents();
});

// Theme Management
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const icon = elements.themeToggleBtn.querySelector('i');
  if (theme === 'dark') {
    icon.className = 'fa-solid fa-sun';
    elements.themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
  } else {
    icon.className = 'fa-solid fa-moon';
    elements.themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
  }
}

function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
}

// Event Listeners Setup
function setupEventListeners() {
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Search with debounce
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = e.target.value.trim();
      state.pagination.page = 1;
      loadStudents();
    }, 300);
  });

  // Filter change handlers
  elements.deptFilter.addEventListener('change', (e) => {
    state.filters.department = e.target.value;
    state.pagination.page = 1;
    loadStudents();
  });

  elements.statusFilter.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    state.pagination.page = 1;
    loadStudents();
  });

  elements.sortByFilter.addEventListener('change', (e) => {
    state.filters.sortBy = e.target.value;
    loadStudents();
  });

  elements.sortOrderBtn.addEventListener('click', () => {
    state.filters.order = state.filters.order === 'ASC' ? 'DESC' : 'ASC';
    const icon = elements.sortOrderBtn.querySelector('i');
    icon.className = state.filters.order === 'ASC' ? 'fa-solid fa-arrow-up-wide-short' : 'fa-solid fa-arrow-down-wide-short';
    loadStudents();
  });

  // Pagination Handlers
  elements.prevPageBtn.addEventListener('click', () => {
    if (state.pagination.page > 1) {
      state.pagination.page--;
      loadStudents();
    }
  });

  elements.nextPageBtn.addEventListener('click', () => {
    if (state.pagination.page < state.pagination.totalPages) {
      state.pagination.page++;
      loadStudents();
    }
  });

  // Add / Edit Modal Handlers
  elements.openAddModalBtn.addEventListener('click', () => openStudentModal('add'));
  elements.closeStudentModalBtn.addEventListener('click', closeStudentModal);
  elements.cancelStudentModalBtn.addEventListener('click', closeStudentModal);
  elements.studentForm.addEventListener('submit', handleStudentFormSubmit);

  // View Modal Handlers
  elements.closeViewModalBtn.addEventListener('click', () => elements.viewModal.classList.remove('active'));

  // Delete Modal Handlers
  elements.closeDeleteModalBtn.addEventListener('click', () => elements.deleteModal.classList.remove('active'));
  elements.cancelDeleteBtn.addEventListener('click', () => elements.deleteModal.classList.remove('active'));
  elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // Avatar randomize handler
  elements.refreshAvatarBtn.addEventListener('click', randomizeAvatar);

  // Export and Data Reset Handlers
  elements.exportCsvBtn.addEventListener('click', exportToCsv);
  elements.exportJsonBtn.addEventListener('click', exportToJson);
  elements.resetDemoBtn.addEventListener('click', handleResetDemoData);

  // Close modals on clicking backdrop
  [elements.studentModal, elements.viewModal, elements.deleteModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });
}

// Fetch and Render Students
async function loadStudents() {
  try {
    const params = new URLSearchParams({
      search: state.filters.search,
      department: state.filters.department,
      status: state.filters.status,
      sortBy: state.filters.sortBy,
      order: state.filters.order,
      page: state.pagination.page,
      limit: state.pagination.limit
    });

    const res = await fetch(`/api/students?${params.toString()}`);
    const data = await res.json();

    if (data.success) {
      state.students = data.data;
      state.pagination = data.pagination;
      renderStudentsTable();
      renderPaginationControls();
    } else {
      showToast('Error loading students', data.message, 'error');
    }
  } catch (err) {
    console.error('Failed to load students:', err);
    showToast('Network Error', 'Could not reach server to load records.', 'error');
  }
}

// Fetch and Render Stats
async function loadStats() {
  try {
    const res = await fetch('/api/students/stats');
    const data = await res.json();
    if (data.success) {
      const { stats, departmentBreakdown } = data;
      elements.statTotalStudents.textContent = stats.totalStudents;
      elements.statActiveStudents.textContent = stats.activeStudents;
      elements.statAverageGpa.textContent = stats.averageGpa ? Number(stats.averageGpa).toFixed(2) : '0.00';
      elements.statDepartments.textContent = stats.totalDepartments;

      renderDepartmentAnalytics(departmentBreakdown, stats.totalStudents);
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Render Table Rows
function renderStudentsTable() {
  elements.studentsTableBody.innerHTML = '';

  if (state.students.length === 0) {
    elements.emptyState.style.display = 'flex';
    elements.tableCard.querySelector('.table-responsive').style.display = 'none';
    return;
  }

  elements.emptyState.style.display = 'none';
  elements.tableCard.querySelector('.table-responsive').style.display = 'block';

  state.students.forEach((student) => {
    const tr = document.createElement('tr');
    tr.id = `student-row-${student.id}`;

    // Status Pill
    const statusClass = getStatusClass(student.status);

    // GPA Pill
    const gpaClass = getGpaClass(student.gpa);

    tr.innerHTML = `
      <td>
        <span class="id-badge">${escapeHtml(student.student_id)}</span>
      </td>
      <td>
        <div class="student-cell">
          <img src="${escapeHtml(student.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + student.first_name)}" 
               alt="${escapeHtml(student.first_name)}" 
               class="student-avatar"
               onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'">
          <div class="student-meta">
            <span class="student-name">${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</span>
            <span class="student-email">${escapeHtml(student.email)}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="dept-tag">
          <i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(student.department)}
        </span>
      </td>
      <td>
        <span class="gpa-pill ${gpaClass}">
          ★ ${Number(student.gpa).toFixed(2)}
        </span>
      </td>
      <td>
        <span class="status-pill ${statusClass}">${escapeHtml(student.status)}</span>
      </td>
      <td>${escapeHtml(formatDate(student.enrollment_date))}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-action view" title="View Profile" onclick="openViewModal(${student.id})">
            <i class="fa-regular fa-eye"></i>
          </button>
          <button class="btn-action edit" title="Edit Student" onclick="openStudentModal('edit', ${student.id})">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="btn-action delete" title="Delete Student" onclick="openDeleteModal(${student.id}, '${escapeQuotes(student.first_name + ' ' + student.last_name)}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    elements.studentsTableBody.appendChild(tr);
  });
}

// Render Pagination
function renderPaginationControls() {
  const { total, page, limit, totalPages } = state.pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  elements.paginationInfo.textContent = `Showing ${start} - ${end} of ${total} students`;

  elements.prevPageBtn.disabled = page <= 1;
  elements.nextPageBtn.disabled = page >= totalPages;

  elements.pageNumbersContainer.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === page ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      state.pagination.page = i;
      loadStudents();
    });
    elements.pageNumbersContainer.appendChild(btn);
  }
}

// Render Department Analytics
function renderDepartmentAnalytics(departments, total) {
  elements.deptAnalyticsList.innerHTML = '';
  if (!departments || departments.length === 0) {
    elements.deptAnalyticsList.innerHTML = '<p class="empty-desc">No departmental statistics available yet.</p>';
    return;
  }

  departments.forEach((dept) => {
    const percentage = total > 0 ? Math.round((dept.count / total) * 100) : 0;
    const item = document.createElement('div');
    item.className = 'dept-item';
    item.innerHTML = `
      <div class="dept-meta">
        <span>${escapeHtml(dept.department)}</span>
        <span>${dept.count} students (${percentage}%) • Avg GPA: ${dept.avgGpa || '0.00'}</span>
      </div>
      <div class="dept-bar-bg">
        <div class="dept-bar-fill" style="width: ${percentage}%"></div>
      </div>
    `;
    elements.deptAnalyticsList.appendChild(item);
  });
}

// Add / Edit Modal Controls
function openStudentModal(mode = 'add', studentId = null) {
  elements.studentForm.reset();
  state.editingStudentId = studentId;

  if (mode === 'add') {
    elements.studentModalTitle.innerHTML = '<i class="fa-solid fa-user-plus"></i> Add New Student';
    document.getElementById('student-id-input').value = `STU-2026-${Math.floor(100 + Math.random() * 900)}`;
    document.getElementById('enrollment-date-input').value = new Date().toISOString().split('T')[0];
    document.getElementById('status-input').value = 'Active';
    document.getElementById('gender-input').value = 'Female';
    randomizeAvatar();
  } else {
    elements.studentModalTitle.innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit Student Record';
    const student = state.students.find((s) => s.id === studentId);
    if (student) {
      populateStudentForm(student);
    } else {
      fetch(`/api/students/${studentId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) populateStudentForm(data.data);
        });
    }
  }

  elements.studentModal.classList.add('active');
}

function populateStudentForm(student) {
  document.getElementById('student-id-input').value = student.student_id;
  document.getElementById('first-name-input').value = student.first_name;
  document.getElementById('last-name-input').value = student.last_name;
  document.getElementById('email-input').value = student.email;
  document.getElementById('phone-input').value = student.phone || '';
  document.getElementById('dept-input').value = student.department;
  document.getElementById('gpa-input').value = student.gpa;
  document.getElementById('status-input').value = student.status;
  document.getElementById('gender-input').value = student.gender || 'Other';
  document.getElementById('enrollment-date-input').value = student.enrollment_date;
  document.getElementById('avatar-url-input').value = student.avatar_url || '';
  document.getElementById('address-input').value = student.address || '';
  elements.avatarPreviewImg.src = student.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.first_name}`;
}

function closeStudentModal() {
  elements.studentModal.classList.remove('active');
  state.editingStudentId = null;
}

function randomizeAvatar() {
  const seed = Math.random().toString(36).substring(7);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  document.getElementById('avatar-url-input').value = avatarUrl;
  elements.avatarPreviewImg.src = avatarUrl;
}

// Handle Form Submission (Create or Update)
async function handleStudentFormSubmit(e) {
  e.preventDefault();

  const formData = {
    student_id: document.getElementById('student-id-input').value.trim(),
    first_name: document.getElementById('first-name-input').value.trim(),
    last_name: document.getElementById('last-name-input').value.trim(),
    email: document.getElementById('email-input').value.trim(),
    phone: document.getElementById('phone-input').value.trim(),
    department: document.getElementById('dept-input').value,
    gpa: parseFloat(document.getElementById('gpa-input').value) || 0.0,
    status: document.getElementById('status-input').value,
    gender: document.getElementById('gender-input').value,
    enrollment_date: document.getElementById('enrollment-date-input').value,
    avatar_url: document.getElementById('avatar-url-input').value.trim(),
    address: document.getElementById('address-input').value.trim()
  };

  // Validation
  if (formData.gpa < 0 || formData.gpa > 4.0) {
    showToast('Validation Error', 'GPA must be between 0.00 and 4.00', 'error');
    return;
  }

  const isEditing = Boolean(state.editingStudentId);
  const url = isEditing ? `/api/students/${state.editingStudentId}` : '/api/students';
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();

    if (data.success) {
      showToast('Success!', isEditing ? 'Student record updated.' : 'New student created successfully.', 'success');
      closeStudentModal();
      loadStudents();
      loadStats();
    } else {
      showToast('Failed to Save', data.message || 'Something went wrong.', 'error');
    }
  } catch (err) {
    console.error('Error saving student:', err);
    showToast('Network Error', 'Could not save student data.', 'error');
  }
}

// Open View Details Modal
async function openViewModal(studentId) {
  try {
    const res = await fetch(`/api/students/${studentId}`);
    const result = await res.json();

    if (!result.success) {
      showToast('Error', 'Unable to retrieve student profile', 'error');
      return;
    }

    const s = result.data;
    const statusClass = getStatusClass(s.status);
    const gpaClass = getGpaClass(s.gpa);

    elements.viewDetailsContainer.innerHTML = `
      <div class="view-hero">
        <img src="${escapeHtml(s.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + s.first_name)}" 
             class="view-avatar" alt="${escapeHtml(s.first_name)}"
             onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=student'">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800;">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.2rem;">
            ID: <span class="id-badge">${escapeHtml(s.student_id)}</span> • ${escapeHtml(s.department)}
          </p>
          <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
            <span class="status-pill ${statusClass}">${escapeHtml(s.status)}</span>
            <span class="gpa-pill ${gpaClass}">GPA: ${Number(s.gpa).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div class="view-details-grid">
        <div class="detail-item">
          <span class="detail-label">Email Address</span>
          <span class="detail-value">${escapeHtml(s.email)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Phone Number</span>
          <span class="detail-value">${escapeHtml(s.phone || 'N/A')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Gender</span>
          <span class="detail-value">${escapeHtml(s.gender || 'Not specified')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Enrollment Date</span>
          <span class="detail-value">${escapeHtml(formatDate(s.enrollment_date))}</span>
        </div>
        <div class="detail-item" style="grid-column: 1 / -1;">
          <span class="detail-label">Residential Address</span>
          <span class="detail-value">${escapeHtml(s.address || 'No address provided')}</span>
        </div>
      </div>
    `;

    elements.viewModal.classList.add('active');
  } catch (err) {
    console.error('Error fetching student details:', err);
    showToast('Error', 'Failed to load details.', 'error');
  }
}

// Open Delete Modal
function openDeleteModal(studentId, studentName) {
  state.deletingStudentId = studentId;
  elements.deleteTargetName.textContent = studentName;
  elements.deleteModal.classList.add('active');
}

// Handle Delete Action
async function handleConfirmDelete() {
  if (!state.deletingStudentId) return;

  try {
    const res = await fetch(`/api/students/${state.deletingStudentId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (data.success) {
      showToast('Deleted', 'Student record removed successfully.', 'info');
      elements.deleteModal.classList.remove('active');
      state.deletingStudentId = null;
      loadStudents();
      loadStats();
    } else {
      showToast('Error', data.message || 'Could not delete student.', 'error');
    }
  } catch (err) {
    console.error('Failed to delete student:', err);
    showToast('Error', 'Network error during delete.', 'error');
  }
}

// Reset Demo Data
async function handleResetDemoData() {
  if (!confirm('Are you sure you want to restore default sample students? This will overwrite recent modifications.')) {
    return;
  }

  try {
    const res = await fetch('/api/students/reset/seed', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Restored', 'Database has been reset to default sample records.', 'success');
      state.pagination.page = 1;
      loadStudents();
      loadStats();
    } else {
      showToast('Error', data.message, 'error');
    }
  } catch (err) {
    console.error('Reset error:', err);
    showToast('Error', 'Failed to reset database.', 'error');
  }
}

// Export to CSV
function exportToCsv() {
  if (state.students.length === 0) {
    showToast('Warning', 'No students available to export.', 'info');
    return;
  }

  const headers = ['ID', 'Student ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Department', 'GPA', 'Status', 'Enrollment Date', 'Address'];
  const csvRows = [headers.join(',')];

  state.students.forEach((s) => {
    const values = [
      s.id,
      `"${s.student_id}"`,
      `"${s.first_name}"`,
      `"${s.last_name}"`,
      `"${s.email}"`,
      `"${s.phone || ''}"`,
      `"${s.department}"`,
      s.gpa,
      `"${s.status}"`,
      `"${s.enrollment_date}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(values.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `students_directory_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Exported', 'Student directory downloaded as CSV.', 'success');
}

// Export to JSON
function exportToJson() {
  if (state.students.length === 0) {
    showToast('Warning', 'No students available to export.', 'info');
    return;
  }

  const blob = new Blob([JSON.stringify(state.students, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `students_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Exported', 'Student data downloaded as JSON.', 'success');
}

// Toast Notifications System
function showToast(title, message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fa-solid fa-circle-info';
  if (type === 'success') iconClass = 'fa-solid fa-circle-check';
  if (type === 'error') iconClass = 'fa-solid fa-triangle-exclamation';

  toast.innerHTML = `
    <div class="toast-icon"><i class="${iconClass}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

// Helper Utilities
function getStatusClass(status) {
  switch (status) {
    case 'Active': return 'status-active';
    case 'Graduated': return 'status-graduated';
    case 'Probation': return 'status-probation';
    case 'On Leave': return 'status-leave';
    default: return 'status-active';
  }
}

function getGpaClass(gpa) {
  const num = parseFloat(gpa);
  if (num >= 3.5) return 'gpa-high';
  if (num >= 3.0) return 'gpa-medium';
  return 'gpa-low';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeQuotes(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'");
}

// Expose globals for inline event handlers
window.openStudentModal = openStudentModal;
window.openViewModal = openViewModal;
window.openDeleteModal = openDeleteModal;
