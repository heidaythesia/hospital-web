/**
 * NexusHealth — Role-Based Hospital Dashboard Engine
 * Single-file SPA logic for Admin (1), Doctor (2), Patient (3)
 */

const IS_PROD = false; // Toggle to true before deploying to Vercel/Netlify
const API_BASE = IS_PROD ? 'https://nexushealth-api.azurewebsites.net' : 'http://localhost:5034';

// ─── UTILITIES ──────────────────────────────────────────────

function parseJwt(token) {
    try { return JSON.parse(atob(token.split('.')[1])); }
    catch (e) { return null; }
}

function getToken() { return localStorage.getItem('hospital_jwt'); }
function getRole() { return localStorage.getItem('hospital_role'); }

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, opts);
        if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return null; }
        if (res.status === 403) { triggerToast('Access Denied.', 'error'); return null; }
        if (res.status >= 500) { triggerToast('Server error. Please try again.', 'error'); return null; }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            triggerToast(err.Error || err.error || 'Request failed.', 'error');
            return null;
        }
        return await res.json();
    } catch (e) {
        console.error('Network error:', e);
        triggerToast('Network error. Is the API running?', 'error');
        return null;
    }
}

function showSkeleton(tbodyId, cols = 4, rows = 3) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    let html = '';
    for (let i = 0; i < rows; i++) {
        html += '<tr>';
        for (let j = 0; j < cols; j++) {
            html += '<td><div style="height:14px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:skeletonPulse 1.5s infinite;border-radius:4px;"></div></td>';
        }
        html += '</tr>';
    }
    tbody.innerHTML = html;
}

function emptyRow(cols, message = 'No data available.', icon = 'fa-inbox') {
    return `<tr><td colspan="${cols}" class="empty-state-cell"><div class="empty-state"><i class="fas ${icon}"></i><p>${message}</p></div></td></tr>`;
}

function formatSmartDate(dateStr) {
    if (!dateStr) return 'N/A';
    if (!dateStr.endsWith('Z')) dateStr += 'Z';
    const d = new Date(dateStr);
    const now = new Date();
    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow  = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const apptDay   = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (apptDay.getTime() === today.getTime())     return `Today at ${time}`;
    if (apptDay.getTime() === tomorrow.getTime())  return `Tomorrow at ${time}`;
    if (apptDay.getTime() === yesterday.getTime()) return `Yesterday at ${time}`;
    return d.toLocaleDateString() + ' ' + time;
}

function formatDate(dateStr) {
    if (!dateStr.endsWith('Z')) dateStr += 'Z';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
    let cls = 'status-pending';
    let label = status;
    if (status === 'Booked') { cls = 'status-pending'; label = 'Pending'; }
    if (status === 'Completed') { cls = 'status-completed'; }
    if (status === 'Cancelled') { cls = 'status-cancelled'; }
    return `<span class="status-badge ${cls}">${label}</span>`;
}

// ─── VALIDATION UTILITIES ─────────────────────────────────────

function isEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function isRequired(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
}
function isMinLength(value, min) {
    return String(value).trim().length >= min;
}
function isPositiveNumber(value) {
    return !isNaN(value) && Number(value) > 0;
}
function isFutureOrToday(dateString) {
    const d = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d >= now;
}
function showFieldError(el, msg) {
    clearFieldError(el);
    el.classList.add('input-error');
    const span = document.createElement('span');
    span.className = 'field-error-msg';
    span.textContent = msg;
    el.insertAdjacentElement('afterend', span);
}
function clearFieldError(el) {
    el.classList.remove('input-error');
    const s = el.nextElementSibling;
    if (s && s.classList.contains('field-error-msg')) s.remove();
}
function clearAllErrors(modal) {
    modal.querySelectorAll('.input-error').forEach(el => clearFieldError(el));
}
function attachLiveClear(modalId) {
    const m = document.getElementById(modalId);
    if (!m) return;
    m.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => clearFieldError(el));
        el.addEventListener('change', () => clearFieldError(el));
    });
}

// ─── CONFIRM DIALOG ─────────────────────────────────────────

function confirmDialog(message, title = 'Confirm Action', confirmLabel = 'Confirm', danger = false) {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmModal');
        if (!modal) { resolve(true); return; }
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        const yesBtn = document.getElementById('confirmYesBtn');
        const noBtn  = document.getElementById('confirmNoBtn');
        yesBtn.textContent = confirmLabel;
        yesBtn.className = danger ? 'btn-danger' : 'btn-primary';
        modal.style.display = 'flex';
        function yes() { cleanup(); resolve(true); }
        function no()  { cleanup(); resolve(false); }
        function cleanup() {
            modal.style.display = 'none';
            yesBtn.removeEventListener('click', yes);
            noBtn.removeEventListener('click', no);
        }
        yesBtn.addEventListener('click', yes);
        noBtn.addEventListener('click', no);
    });
}

// ─── ADMIN DATA CACHE ────────────────────────────────────────

let _adminCache = { doctors: [], patients: [], appointments: [], ts: 0 };
const CACHE_TTL = 90000;

async function getAdminData(force = false) {
    if (!force && _adminCache.ts && (Date.now() - _adminCache.ts < CACHE_TTL)) return _adminCache;
    const [d, p, a] = await Promise.all([
        apiCall('/api/Admin/doctors'),
        apiCall('/api/Admin/patients'),
        apiCall('/api/Admin/appointments')
    ]);
    _adminCache = {
        doctors:      Array.isArray(d) ? d : [],
        patients:     Array.isArray(p) ? p : [],
        appointments: Array.isArray(a) ? a : [],
        ts: Date.now()
    };
    return _adminCache;
}
function invalidateAdminCache() { _adminCache.ts = 0; }

// ─── TOAST SYSTEM ───────────────────────────────────────────

window.triggerToast = function(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';

    let iconClass = 'fas fa-check-circle', iconColor = 'var(--accent)', title = 'Success';
    if (type === 'error') { iconClass = 'fas fa-exclamation-circle'; iconColor = 'var(--danger)'; title = 'Error'; toast.style.borderLeftColor = 'var(--danger)'; }
    else if (type === 'info') { iconClass = 'fas fa-info-circle'; iconColor = 'var(--primary)'; title = 'Info'; toast.style.borderLeftColor = 'var(--primary)'; }

    toast.innerHTML = `<i class="${iconClass}" style="color:${iconColor}"></i><div class="toast-content"><h4>${title}</h4><p>${message}</p></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
};

// ─── SIDEBAR BUILDER ────────────────────────────────────────

const SIDEBAR_CONFIG = {
    '1': [ // Admin
        { id: 'nav-admin-dashboard', icon: 'fa-th-large', label: 'Dashboard', page: 'admin-dashboard' },
        { id: 'nav-admin-doctors', icon: 'fa-user-md', label: 'Doctors', page: 'admin-doctors' },
        { id: 'nav-admin-patients', icon: 'fa-user-injured', label: 'Patients', page: 'admin-patients' },
        { id: 'nav-admin-appointments', icon: 'fa-calendar-alt', label: 'Appointments', page: 'admin-appointments' },
        { id: 'nav-admin-reports', icon: 'fa-chart-pie', label: 'Reports', page: 'admin-reports' },
    ],
    '2': [ // Doctor
        { id: 'nav-doctor-dashboard', icon: 'fa-th-large', label: 'Dashboard', page: 'doctor-dashboard' },
        { id: 'nav-doctor-appointments', icon: 'fa-calendar-check', label: 'My Appointments', page: 'doctor-appointments' },
    ],
    '3': [ // Patient
        { id: 'nav-patient-dashboard', icon: 'fa-th-large', label: 'Dashboard', page: 'patient-dashboard' },
        { id: 'nav-patient-appointments', icon: 'fa-calendar-check', label: 'My Appointments', page: 'patient-appointments' },
        { id: 'nav-patient-prescriptions', icon: 'fa-prescription-bottle-alt', label: 'My Prescriptions', page: 'patient-prescriptions' },
    ]
};

function buildSidebar(role) {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    const items = SIDEBAR_CONFIG[role] || [];
    nav.innerHTML = items.map((item, i) =>
        `<li><a href="#" class="nav-item ${i === 0 ? 'active' : ''}" id="${item.id}" onclick="setActivePage('${item.page}', this)"><i class="fas ${item.icon}"></i><span class="nav-text">${item.label}</span></a></li>`
    ).join('');
}

// ─── SPA NAVIGATION ENGINE ─────────────────────────────────

// Maps page names to { sectionId, fetcher }
const PAGE_MAP = {
    // Admin
    'admin-dashboard':     { section: 'adminDashboardView',       fetcher: fetchAdminDashboard },
    'admin-doctors':       { section: 'section-admin-doctors',    fetcher: fetchAdminDoctors },
    'admin-patients':      { section: 'section-admin-patients',   fetcher: fetchAdminPatients },
    'admin-appointments':  { section: 'section-admin-appointments', fetcher: fetchAdminAppointments },
    'admin-reports':       { section: 'section-admin-reports',    fetcher: fetchAdminReports },
    // Doctor
    'doctor-dashboard':    { section: 'doctorDashboardView',      fetcher: fetchDoctorDashboard },
    'doctor-appointments': { section: 'section-doctor-appointments', fetcher: fetchDoctorAppointments },
    // Patient
    'patient-dashboard':    { section: 'patientDashboardView',     fetcher: fetchPatientDashboard },
    'patient-appointments': { section: 'section-patient-appointments', fetcher: fetchPatientAppointments },
    'patient-prescriptions':{ section: 'section-patient-prescriptions', fetcher: fetchPatientPrescriptions },
};

window.setActivePage = function(page, clickedNav) {
    // Update sidebar active state
    document.querySelectorAll('#sidebarNav .nav-item').forEach(el => el.classList.remove('active'));
    if (clickedNav) clickedNav.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.page-section').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('section-visible');
    });

    // Show target section with transition
    const mapping = PAGE_MAP[page];
    if (mapping) {
        const section = document.getElementById(mapping.section);
        if (section) {
            section.style.display = 'block';
            // Trigger reflow so animation restarts
            void section.offsetHeight;
            section.classList.add('section-visible');
        }
        if (mapping.fetcher) mapping.fetcher();
    }

    // Scroll content area to top
    const ca = document.getElementById('dashboardContent');
    if (ca) ca.scrollTop = 0;
};

// ─── ENTRY POINT ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    const role = getRole();

    if (!token) { window.location.href = 'login.html'; return; }

    const jwt = parseJwt(token);
    const email = jwt?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || 'User';

    // Update header
    const nameEl = document.getElementById('userNameDisplay');
    const roleEl = document.getElementById('userRoleDisplay');
    const avatarEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.innerText = email;
    if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=eff6ff&color=2563eb`;

    // Build sidebar for role
    buildSidebar(role);

    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (window.innerWidth > 768) sidebar.classList.toggle('collapsed');
            else sidebar.classList.toggle('mobile-open');
        });
    }

    // Load initial dashboard
    if (role === '1') {
        if (roleEl) roleEl.innerText = 'System Administrator';
        setActivePage('admin-dashboard', document.getElementById('nav-admin-dashboard'));
    } else if (role === '2') {
        if (roleEl) roleEl.innerText = 'Attending Physician';
        const docWelcome = document.getElementById('doctorWelcomeName');
        if (docWelcome) docWelcome.innerText = email;
        setActivePage('doctor-dashboard', document.getElementById('nav-doctor-dashboard'));
    } else if (role === '3') {
        if (roleEl) roleEl.innerText = 'Patient Portal';
        setActivePage('patient-dashboard', document.getElementById('nav-patient-dashboard'));
    } else {
        window.location.href = 'login.html';
    }

    // Form handlers
    document.getElementById('createDoctorForm')?.addEventListener('submit', handleCreateDoctor);
    document.getElementById('prescriptionForm')?.addEventListener('submit', handlePrescription);
    document.getElementById('bookingForm')?.addEventListener('submit', handleBooking);

    // Setup live validation clearing
    attachLiveClear('createDoctorModal');
    attachLiveClear('bookingModal');
    attachLiveClear('prescriptionModal');
});

// ─── ADMIN FUNCTIONS ────────────────────────────────────────

async function fetchAdminDashboard() {
    showSkeleton('admin-dash-appointments-tbody', 4);
    const [doctors, patients, appointments] = await Promise.all([
        apiCall('/api/Admin/doctors'),
        apiCall('/api/Admin/patients'),
        apiCall('/api/Admin/appointments')
    ]);

    const docArr  = Array.isArray(doctors)      ? doctors      : [];
    const patArr  = Array.isArray(patients)     ? patients     : [];
    const apptArr = Array.isArray(appointments) ? appointments : [];

    // Seed cache for filter functions
    _adminDoctorsData      = docArr;
    _adminPatientsData     = patArr;
    _adminAppointmentsData = apptArr;

    document.getElementById('kpi-admin-doctors').innerText      = docArr.length;
    document.getElementById('kpi-admin-patients').innerText     = patArr.length;
    document.getElementById('kpi-admin-appointments').innerText = apptArr.length;

    const tbody = document.getElementById('admin-dash-appointments-tbody');
    if (apptArr.length === 0) { tbody.innerHTML = emptyRow(4, 'No appointments yet.'); return; }
    tbody.innerHTML = apptArr.slice(0, 5).map(a =>
        `<tr><td style="font-weight:500">${a.patientName}</td><td><i class="fas fa-user-md" style="color:var(--primary);margin-right:5px"></i>${a.doctorName}</td><td>${formatDate(a.dateTime)}</td><td>${statusBadge(a.status)}</td></tr>`
    ).join('');
}

async function fetchAdminDoctors() {
    showSkeleton('admin-doctors-tbody', 5);
    const data = await apiCall('/api/Admin/doctors');
    const tbody = document.getElementById('admin-doctors-tbody');
    _adminDoctorsData = Array.isArray(data) ? data : [];
    if (_adminDoctorsData.length === 0) { tbody.innerHTML = emptyRow(5, 'No doctors registered yet.', 'fa-user-md'); return; }
    tbody.innerHTML = _adminDoctorsData.map(d =>
        `<tr><td style="font-weight:500">${d.name}</td><td><span class="status-badge" style="background:var(--primary-light);color:var(--primary)">${d.specialization}</span></td><td>${d.email}</td><td>$${d.fees || 0}</td><td><button class="btn-icon" style="color:var(--primary)" onclick="triggerToast('Edit feature coming soon!','info')"><i class="fas fa-edit"></i></button> <button class="btn-icon" style="color:var(--danger)" onclick="triggerToast('Delete feature coming soon!','info')"><i class="fas fa-trash"></i></button></td></tr>`
    ).join('');
}

async function fetchAdminPatients() {
    showSkeleton('admin-patients-tbody', 4);
    const data = await apiCall('/api/Admin/patients');
    const tbody = document.getElementById('admin-patients-tbody');
    _adminPatientsData = Array.isArray(data) ? data : [];
    if (_adminPatientsData.length === 0) { tbody.innerHTML = emptyRow(4, 'No patients registered.', 'fa-user-injured'); return; }
    tbody.innerHTML = _adminPatientsData.map(p =>
        `<tr><td style="font-weight:500">${p.name}</td><td>${p.gender || 'N/A'}</td><td>${p.dob || 'N/A'}</td><td>${p.email || 'N/A'}</td></tr>`
    ).join('');
}

async function fetchAdminAppointments() {
    showSkeleton('admin-appointments-tbody', 4);
    const data = await apiCall('/api/Admin/appointments');
    _adminAppointmentsData = Array.isArray(data) ? data : [];
    const tbody = document.getElementById('admin-appointments-tbody');
    if (_adminAppointmentsData.length === 0) { tbody.innerHTML = emptyRow(4, 'No appointments found.', 'fa-calendar-times'); return; }
    tbody.innerHTML = _adminAppointmentsData.map(a =>
        `<tr><td style="font-weight:500">${a.patientName}</td><td>${a.doctorName}</td><td>${formatSmartDate(a.dateTime)}</td><td>${statusBadge(a.status)}</td></tr>`
    ).join('');
}

// ─── ADMIN REPORTS & ANALYTICS ──────────────────────────────
let _adminReportsData = [];
let chartStatusInstance = null;
let chartDoctorInstance = null;

async function fetchAdminReports() {
    showSkeleton('report-table-tbody', 4);
    // Fetch data (could be cached but we'll fetch fresh on tab load)
    const data = await apiCall('/api/Admin/appointments');
    _adminReportsData = Array.isArray(data) ? data : [];
    
    // reset filters
    document.getElementById('reportFilterStatus').value = '';
    document.getElementById('reportFilterDate').value = '';
    
    renderAdminReports(_adminReportsData);
}

function applyReportFilters() {
    const statusFilter = document.getElementById('reportFilterStatus').value;
    const dateFilter = document.getElementById('reportFilterDate').value;
    
    let filtered = _adminReportsData;
    if (statusFilter) {
        filtered = filtered.filter(a => a.status === statusFilter);
    }
    if (dateFilter) {
        // match YYYY-MM-DD
        filtered = filtered.filter(a => a.dateTime.startsWith(dateFilter));
    }
    renderAdminReports(filtered);
}

function renderAdminReports(data) {
    // 1. KPIs
    const completed = data.filter(a => a.status === 'Completed').length;
    const cancelled = data.filter(a => a.status === 'Cancelled').length;
    const rate = data.length > 0 ? Math.round((completed / data.length) * 100) : 0;
    
    document.getElementById('kpi-report-total').innerText = data.length;
    document.getElementById('kpi-report-completed').innerText = completed;
    document.getElementById('kpi-report-cancelled').innerText = cancelled;
    document.getElementById('kpi-report-rate').innerText = rate + '%';

    // 2. Table
    const tbody = document.getElementById('report-table-tbody');
    if (data.length === 0) {
        tbody.innerHTML = emptyRow(4, 'No appointments match the selected filters.', 'fa-filter');
    } else {
        tbody.innerHTML = data.map(a =>
            `<tr><td style="font-weight:500">${a.patientName}</td><td>${a.doctorName}</td><td>${formatSmartDate(a.dateTime)}</td><td>${statusBadge(a.status)}</td></tr>`
        ).join('');
    }

    // 3. Charts
    if (!window.Chart) return; // fail safe if Chart.js didn't load

    // Status Chart
    const statusCounts = { 'Booked': 0, 'Completed': 0, 'Cancelled': 0 };
    data.forEach(a => { if (statusCounts[a.status] !== undefined) statusCounts[a.status]++; });
    
    const ctxStatus = document.getElementById('chartApptStatus');
    if (chartStatusInstance) chartStatusInstance.destroy();
    chartStatusInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Booked', 'Completed', 'Cancelled'],
            datasets: [{
                data: [statusCounts['Booked'], statusCounts['Completed'], statusCounts['Cancelled']],
                backgroundColor: ['#F59E0B', '#22C55E', '#EF4444'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Doctor Performance Chart (Appointments per doctor)
    const docCounts = {};
    data.forEach(a => { docCounts[a.doctorName] = (docCounts[a.doctorName] || 0) + 1; });
    const sortedDocs = Object.entries(docCounts).sort((a, b) => b[1] - a[1]).slice(0, 5); // top 5
    
    const ctxDoc = document.getElementById('chartDocPerf');
    if (chartDoctorInstance) chartDoctorInstance.destroy();
    chartDoctorInstance = new Chart(ctxDoc, {
        type: 'bar',
        data: {
            labels: sortedDocs.map(d => d[0]),
            datasets: [{
                label: 'Appointments',
                data: sortedDocs.map(d => d[1]),
                backgroundColor: '#2563EB',
                borderRadius: 4,
                maxBarThickness: 60
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

// Admin: Create Doctor Modal
window.openCreateDoctorModal = function() {
    document.getElementById('createDoctorForm').reset();
    document.getElementById('createDoctorModal').style.display = 'flex';
};
window.closeCreateDoctorModal = function() {
    clearAllErrors(document.getElementById('createDoctorModal'));
    document.getElementById('createDoctorModal').style.display = 'none';
};

async function handleCreateDoctor(e) {
    e.preventDefault();

    const modal = document.getElementById('createDoctorModal');
    clearAllErrors(modal);
    const nameEl  = document.getElementById('adminDocName');
    const emailEl = document.getElementById('adminDocEmail');
    const passEl  = document.getElementById('adminDocPass');
    const specEl  = document.getElementById('adminDocSpec');
    const feesEl  = document.getElementById('adminDocFees');
    let ok = true;
    if (!isRequired(nameEl.value))        { showFieldError(nameEl,  'Name is required.'); ok = false; }
    if (!isEmailValid(emailEl.value))     { showFieldError(emailEl, 'Enter a valid email.'); ok = false; }
    if (!isMinLength(passEl.value, 6))    { showFieldError(passEl,  'Password must be at least 6 characters.'); ok = false; }
    if (!isRequired(specEl.value))        { showFieldError(specEl,  'Specialization is required.'); ok = false; }
    if (!isPositiveNumber(feesEl.value))  { showFieldError(feesEl,  'Fees must be a valid positive number.'); ok = false; }
    if (!ok) return;

    const btn = document.getElementById('createDocSubmitBtn');
    btn.textContent = 'Creating...'; btn.disabled = true;

    const payload = {
        userName: document.getElementById('adminDocName').value,
        email: document.getElementById('adminDocEmail').value,
        password: document.getElementById('adminDocPass').value,
        roleId: 2,
        specialization: document.getElementById('adminDocSpec').value,
        fees: parseFloat(document.getElementById('adminDocFees').value)
    };

    const result = await apiCall('/api/Auth/register', 'POST', payload);
    btn.textContent = 'Create Account'; btn.disabled = false;

    if (result) {
        triggerToast('Doctor registered successfully!', 'success');
        closeCreateDoctorModal();
        fetchAdminDoctors();
        fetchAdminDashboard();
    }
}

// ─── DOCTOR FUNCTIONS ───────────────────────────────────────

async function fetchDoctorDashboard() {
    showSkeleton('doctor-dash-appointments-tbody', 4);

    // KPIs
    const kpi = await apiCall('/api/Doctor/kpi');
    if (kpi) {
        document.getElementById('kpi-doc-patients').innerText = kpi.totalPatients ?? '-';
        document.getElementById('kpi-doc-today').innerText = kpi.todaysAppointments ?? '-';
        document.getElementById('kpi-doc-pending').innerText = kpi.pendingAppointments ?? '-';
    }

    // Recent appointments (last 5)
    const data = await apiCall('/api/Doctor/appointments');
    const tbody = document.getElementById('doctor-dash-appointments-tbody');
    const arr = Array.isArray(data) ? data : [];
    if (arr.length === 0) { tbody.innerHTML = emptyRow(4, 'No appointments assigned.'); return; }

    tbody.innerHTML = arr.slice(0, 5).map(a => {
        let actionHtml = '';
        if (a.status === 'Completed') actionHtml = `<button class="btn-outline" onclick="openPrescriptionModal(${a.appointmentID},'${a.patientName.replace(/'/g, "\\'")}')" style="font-size:12px;padding:4px 10px"><i class="fas fa-prescription-bottle-alt"></i> Prescribe</button>`;
        else if (a.status === 'Cancelled') actionHtml = `<span style="color:var(--danger);font-size:0.85em"><i class="fas fa-ban"></i> Cancelled</span>`;
        else actionHtml = `<span style="color:var(--warning);font-size:0.85em"><i class="fas fa-hourglass-half"></i> Pending</span>`;
        return `<tr><td style="font-weight:500">${a.patientName}</td><td>${formatDate(a.appointmentDate)}</td><td>${statusBadge(a.status)}</td><td>${actionHtml}</td></tr>`;
    }).join('');
}

async function fetchDoctorAppointments() {
    showSkeleton('doctor-appointments-tbody', 6);
    const data = await apiCall('/api/Doctor/appointments');
    _doctorAppointmentsData = Array.isArray(data) ? data : [];
    const tbody = document.getElementById('doctor-appointments-tbody');
    if (_doctorAppointmentsData.length === 0) { tbody.innerHTML = emptyRow(6, 'No appointments assigned.', 'fa-calendar-times'); return; }
    // Reset filter
    const filterEl = document.getElementById('doctor-appt-filter');
    if (filterEl) filterEl.value = '';
    renderDoctorAppointmentRows(tbody, _doctorAppointmentsData);
}

// Doctor: Update appointment status
window.updateAppointmentStatus = async function(id, status) {
    if (status === 'Cancelled') {
        const ok = await confirmDialog(
            'Cancelling cannot be undone. Are you sure?',
            'Cancel Appointment', 'Yes, Cancel', true
        );
        if (!ok) { fetchDoctorAppointments(); return; }
    }
    const result = await apiCall(`/api/Doctor/appointment/${id}/status`, 'PUT', { status });
    if (result) {
        const msg = status === 'Completed' ? 'Marked as completed!' : status === 'Cancelled' ? 'Appointment cancelled.' : 'Status updated!';
        triggerToast(msg, status === 'Cancelled' ? 'error' : 'success');
        fetchDoctorAppointments();
        fetchDoctorDashboard();
    }
};

// Doctor: Prescription Modal
window.openPrescriptionModal = function(appointmentId, patientName) {
    document.getElementById('prescAppointmentId').value = appointmentId;
    document.getElementById('prescPatientName').innerText = patientName;
    document.getElementById('prescriptionForm').reset();
    document.getElementById('prescAppointmentId').value = appointmentId; // re-set after reset
    document.getElementById('prescriptionModal').style.display = 'flex';
};
window.closePrescriptionModal = function() {
    clearAllErrors(document.getElementById('prescriptionModal'));
    document.getElementById('prescriptionModal').style.display = 'none';
};

async function handlePrescription(e) {
    e.preventDefault();

    const modal  = document.getElementById('prescriptionModal');
    clearAllErrors(modal);
    const medEl  = document.getElementById('prescMedicine');
    const noteEl = document.getElementById('prescNotes');
    let ok = true;
    if (!isRequired(medEl.value))  { showFieldError(medEl,  'Medicine name is required.'); ok = false; }
    if (!isRequired(noteEl.value)) { showFieldError(noteEl, 'Instructions are required.'); ok = false; }
    if (!ok) return;

    const btn = document.getElementById('prescSubmitBtn');
    btn.textContent = 'Submitting...'; btn.disabled = true;

    const payload = {
        appointmentId: parseInt(document.getElementById('prescAppointmentId').value),
        medicine: document.getElementById('prescMedicine').value.trim(),
        notes: document.getElementById('prescNotes').value.trim()
    };

    const result = await apiCall('/api/Prescription/issue', 'POST', payload);
    btn.textContent = 'Submit Prescription'; btn.disabled = false;

    if (result) {
        triggerToast('Prescription issued successfully!', 'success');
        closePrescriptionModal();
        fetchDoctorAppointments();
    }
}

// ─── PATIENT FUNCTIONS ──────────────────────────────────────

let _patientAppointmentsCache = []; // cache for KPI computation

async function fetchPatientDashboard() {
    showSkeleton('patient-dash-appointments-tbody', 4);

    const [apptData, rxData] = await Promise.all([
        apiCall('/api/Patient/my-appointments'),
        apiCall('/api/Prescription/my-prescriptions')
    ]);

    const appts = Array.isArray(apptData) ? apptData : [];
    _patientAppointmentsCache = appts;

    // KPIs
    document.getElementById('kpi-pat-total').innerText = appts.length;
    document.getElementById('kpi-pat-upcoming').innerText = appts.filter(a => a.status === 'Booked').length;
    document.getElementById('kpi-pat-completed').innerText = appts.filter(a => a.status === 'Completed').length;

    // Recent 5 appointments
    const tbody = document.getElementById('patient-dash-appointments-tbody');
    if (appts.length === 0) { tbody.innerHTML = emptyRow(4, 'No appointments yet. <a href="#" onclick="openBookingModal()" style="color:var(--primary);text-decoration:underline">Book one now!</a>'); return; }
    tbody.innerHTML = appts.slice(0, 5).map(a =>
        `<tr><td style="font-weight:500">${a.doctorName}</td><td>${a.specialization || 'General'}</td><td>${formatDate(a.appointmentDate)}</td><td>${statusBadge(a.status)}</td></tr>`
    ).join('');
}

async function fetchPatientAppointments() {
    showSkeleton('patient-appointments-tbody', 4);
    const data = await apiCall('/api/Patient/my-appointments');
    const tbody = document.getElementById('patient-appointments-tbody');
    const arr = Array.isArray(data) ? data : [];
    if (arr.length === 0) { tbody.innerHTML = emptyRow(4, 'No appointments yet. Book one from the dashboard!', 'fa-calendar-plus'); return; }
    tbody.innerHTML = arr.map(a =>
        `<tr><td style="font-weight:500">${a.doctorName}</td><td>${a.specialization || 'General'}</td><td>${formatSmartDate(a.appointmentDate)}</td><td>${statusBadge(a.status)}</td></tr>`
    ).join('');
}

async function fetchPatientPrescriptions() {
    showSkeleton('patient-prescriptions-tbody', 4);
    const data = await apiCall('/api/Prescription/my-prescriptions');
    const tbody = document.getElementById('patient-prescriptions-tbody');
    const arr = Array.isArray(data) ? data : [];
    if (arr.length === 0) { tbody.innerHTML = emptyRow(4, 'No prescriptions issued yet.', 'fa-prescription-bottle-alt'); return; }
    tbody.innerHTML = arr.map(rx =>
        `<tr><td>${formatSmartDate(rx.dateIssued)}</td><td style="font-weight:500">${rx.doctorName || 'Unknown'}</td><td style="color:var(--primary);font-weight:500">${rx.medicine}</td><td>${rx.notes || ''}</td></tr>`
    ).join('');
}

// Patient: Booking Modal
window.openBookingModal = async function() {
    document.getElementById('bookingModal').style.display = 'flex';
    const select = document.getElementById('bookingDoctorId');
    select.innerHTML = '<option value="">Loading doctors...</option>';
    const feeBox = document.getElementById('doctorFeeInfo');
    if (feeBox) feeBox.style.display = 'none';

    // Set min date to now
    const dateInput = document.getElementById('bookingDate');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    now.setSeconds(0, 0);
    dateInput.min = now.toISOString().slice(0, 16);

    const doctors = await apiCall('/api/Patient/doctors');
    if (!doctors) { select.innerHTML = '<option value="">Failed to load</option>'; return; }
    _bookingDoctorsList = doctors;
    select.innerHTML = '<option value="" disabled selected>Select a Doctor</option>' +
        doctors.map(d => `<option value="${d.doctorID}">${d.doctorName} — ${d.specialization}</option>`).join('');
};
window.closeBookingModal = function() {
    clearAllErrors(document.getElementById('bookingModal'));
    document.getElementById('bookingModal').style.display = 'none';
};

async function handleBooking(e) {
    e.preventDefault();

    const modal  = document.getElementById('bookingModal');
    clearAllErrors(modal);
    const docEl  = document.getElementById('bookingDoctorId');
    const dateEl = document.getElementById('bookingDate');
    let ok = true;
    if (!isRequired(docEl.value))
        { showFieldError(docEl,  'Please select a doctor.'); ok = false; }
    if (!isRequired(dateEl.value) || !isFutureOrToday(dateEl.value))
        { showFieldError(dateEl, 'Please select today or a future date and time.'); ok = false; }
    if (!ok) return;

    const btn = document.getElementById('bookingSubmitBtn');
    btn.textContent = 'Booking...'; btn.disabled = true;

    const payload = {
        doctorId: parseInt(document.getElementById('bookingDoctorId').value),
        appointmentDate: new Date(document.getElementById('bookingDate').value).toISOString()
    };

    const result = await apiCall('/api/Patient/book', 'POST', payload);
    btn.textContent = 'Confirm Booking'; btn.disabled = false;

    if (result) {
        triggerToast('Appointment booked successfully!', 'success');
        closeBookingModal();
        fetchPatientDashboard();
        fetchPatientAppointments();
    }
}

// ─── GLOBAL LOGOUT ──────────────────────────────────────────

window.logout = async function(e) {
    if (e) e.preventDefault();
    const ok = await confirmDialog('Are you sure you want to log out?', 'Log Out', 'Log Out', true);
    if (ok) { localStorage.clear(); window.location.href = 'login.html'; }
};

// ─── ADMIN FILTER FUNCTIONS ──────────────────────────────────

let _adminDoctorsData = [], _adminPatientsData = [], _adminAppointmentsData = [];

window.filterDoctorsTable = function(query) {
    const q = (query || '').toLowerCase();
    const filtered = _adminDoctorsData.filter(d =>
        d.name.toLowerCase().includes(q) || (d.specialization || '').toLowerCase().includes(q)
    );
    const tbody = document.getElementById('admin-doctors-tbody');
    if (!tbody) return;
    if (filtered.length === 0) { tbody.innerHTML = emptyRow(5, 'No doctors match your search.', 'fa-user-md'); return; }
    tbody.innerHTML = filtered.map(d =>
        `<tr><td style="font-weight:500">${d.name}</td><td><span class="status-badge" style="background:var(--primary-light);color:var(--primary)">${d.specialization}</span></td><td>${d.email}</td><td>$${d.fees || 0}</td><td><button class="btn-icon" style="color:var(--primary)" onclick="triggerToast('Edit feature coming soon!','info')"><i class="fas fa-edit"></i></button> <button class="btn-icon" style="color:var(--danger)" onclick="triggerToast('Delete feature coming soon!','info')"><i class="fas fa-trash"></i></button></td></tr>`
    ).join('');
};

window.filterPatientsTable = function(query) {
    const q = (query || '').toLowerCase();
    const filtered = _adminPatientsData.filter(p =>
        p.name.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
    );
    const tbody = document.getElementById('admin-patients-tbody');
    if (!tbody) return;
    if (filtered.length === 0) { tbody.innerHTML = emptyRow(4, 'No patients match your search.', 'fa-user-injured'); return; }
    tbody.innerHTML = filtered.map(p =>
        `<tr><td style="font-weight:500">${p.name}</td><td>${p.gender || 'N/A'}</td><td>${p.dob || 'N/A'}</td><td>${p.email || 'N/A'}</td></tr>`
    ).join('');
};

window.filterAdminAppointments = function() {
    const q      = (document.getElementById('admin-appt-search')?.value || '').toLowerCase();
    const status = document.getElementById('admin-appt-filter')?.value || '';
    let filtered = _adminAppointmentsData;
    if (q)      filtered = filtered.filter(a => a.patientName.toLowerCase().includes(q) || a.doctorName.toLowerCase().includes(q));
    if (status) filtered = filtered.filter(a => a.status === status);
    const tbody = document.getElementById('admin-appointments-tbody');
    if (!tbody) return;
    if (filtered.length === 0) { tbody.innerHTML = emptyRow(4, 'No appointments match the filters.', 'fa-calendar-times'); return; }
    tbody.innerHTML = filtered.map(a =>
        `<tr><td style="font-weight:500">${a.patientName}</td><td>${a.doctorName}</td><td>${formatSmartDate(a.dateTime)}</td><td>${statusBadge(a.status)}</td></tr>`
    ).join('');
};

// ─── DOCTOR FILTER + STATUS-LOCK ────────────────────────────

let _doctorAppointmentsData = [];

window.filterDoctorAppointments = function() {
    const status = document.getElementById('doctor-appt-filter')?.value || '';
    const filtered = status ? _doctorAppointmentsData.filter(a => a.status === status) : _doctorAppointmentsData;
    const tbody = document.getElementById('doctor-appointments-tbody');
    if (!tbody) return;
    if (filtered.length === 0) { tbody.innerHTML = emptyRow(6, 'No appointments match the filter.', 'fa-calendar-times'); return; }
    renderDoctorAppointmentRows(tbody, filtered);
};

function renderDoctorAppointmentRows(tbody, arr) {
    tbody.innerHTML = arr.map(a => {
        let statusCell, actionHtml;
        if (a.status === 'Completed' || a.status === 'Cancelled') {
            const cls  = a.status === 'Completed' ? 'completed' : 'cancelled';
            const icon = a.status === 'Completed' ? 'fa-check-circle' : 'fa-ban';
            statusCell = `<span class="status-locked ${cls}"><i class="fas ${icon}"></i> ${a.status}</span>`;
        } else {
            statusCell = `<select onchange="updateAppointmentStatus(${a.appointmentID}, this.value)" style="padding:5px 8px;border-radius:6px;border:1px solid var(--border-color);font-size:13px;background:var(--surface);">
                <option value="Booked" selected>Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
            </select>`;
        }
        if (a.status === 'Completed')
            actionHtml = `<button class="btn-outline" onclick="openPrescriptionModal(${a.appointmentID},'${a.patientName.replace(/'/g, "\\'")}')"><i class="fas fa-prescription-bottle-alt"></i> Prescribe</button>`;
        else if (a.status === 'Cancelled')
            actionHtml = `<span style="color:var(--danger);font-size:0.85em"><i class="fas fa-ban"></i> Cancelled</span>`;
        else
            actionHtml = `<span style="color:var(--warning);font-size:0.85em"><i class="fas fa-hourglass-half"></i> Pending check-up</span>`;
        return `<tr><td style="font-weight:500">${a.patientName}</td><td>${a.patientGender||'N/A'}</td><td>${a.patientAge||'N/A'}</td><td>${formatSmartDate(a.appointmentDate)}</td><td>${statusCell}</td><td>${actionHtml}</td></tr>`;
    }).join('');
}

// ─── BOOKING: DOCTOR FEE DISPLAY ────────────────────────────

let _bookingDoctorsList = [];
window.onBookingDoctorChange = function(sel) {
    const doctorId = parseInt(sel.value);
    const doc = _bookingDoctorsList.find(d => d.doctorID === doctorId);
    const feeBox  = document.getElementById('doctorFeeInfo');
    const feeText = document.getElementById('doctorFeeText');
    if (doc && feeBox && feeText) {
        feeText.textContent = `Consultation Fee: $${doc.fees || 'N/A'}`;
        feeBox.style.display = 'flex';
    } else if (feeBox) {
        feeBox.style.display = 'none';
    }
};

// ─── KEYBOARD + BACKDROP MODAL DISMISS ──────────────────────

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['createDoctorModal','prescriptionModal','bookingModal','confirmModal'].forEach(id => {
        const m = document.getElementById(id);
        if (m && m.style.display === 'flex') m.style.display = 'none';
    });
});

['createDoctorModal','prescriptionModal','bookingModal'].forEach(id => {
    const m = document.getElementById(id);
    if (!m) return;
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
});
