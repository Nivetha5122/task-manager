// ============================================================
// Task Manager API Console — frontend logic
// Talks to the backend REST API (register, login, CRUD tasks)
// ============================================================

const state = {
  token: localStorage.getItem('tm_token') || null,
  user: JSON.parse(localStorage.getItem('tm_user') || 'null'),
  page: 1,
  limit: 5,
  totalPages: 1,
  editingTaskId: null,
};

const el = (id) => document.getElementById(id);
const apiBaseInput = el('apiBaseUrl');

const getBaseUrl = () => apiBaseInput.value.replace(/\/+$/, '');

// ---------------------------------------------------------
// Toast + status bar helpers
// ---------------------------------------------------------
let toastTimer;
function showToast(message, type = 'info') {
  const toast = el('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function logRequest(method, path, status) {
  el('lastRequest').textContent = `${method} ${path} → ${status}`;
}

// ---------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------
async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;

  let res, json;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    json = await res.json().catch(() => ({}));
  } catch (networkErr) {
    logRequest(method, path, 'NETWORK ERROR');
    throw new Error('Could not reach the API. Is the backend server running?');
  }

  logRequest(method, path, res.status);

  if (!res.ok) {
    const message = json.message || `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.errors = json.errors;
    throw err;
  }

  return json;
}

// ---------------------------------------------------------
// Auth: tab switching
// ---------------------------------------------------------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.form').forEach((f) => f.classList.remove('active'));
    tab.classList.add('active');
    el(`${tab.dataset.tab}Form`).classList.add('active');
  });
});

// ---------------------------------------------------------
// Auth: register
// ---------------------------------------------------------
el('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      auth: false,
      body: {
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
        role: form.get('role'),
      },
    });
    onLoginSuccess(res.data);
    showToast(`Account created. Welcome, ${res.data.user.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ---------------------------------------------------------
// Auth: login
// ---------------------------------------------------------
el('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: form.get('email'), password: form.get('password') },
    });
    onLoginSuccess(res.data);
    showToast(`Welcome back, ${res.data.user.name}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function onLoginSuccess({ user, token }) {
  state.token = token;
  state.user = user;
  localStorage.setItem('tm_token', token);
  localStorage.setItem('tm_user', JSON.stringify(user));
  renderAuthState();
  loadTasks();
}

// ---------------------------------------------------------
// Auth: logout
// ---------------------------------------------------------
el('logoutBtn').addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('tm_token');
  localStorage.removeItem('tm_user');
  renderAuthState();
  showToast('Logged out', 'info');
});

// ---------------------------------------------------------
// Render auth-dependent UI
// ---------------------------------------------------------
function renderAuthState() {
  const loggedIn = Boolean(state.token && state.user);

  el('authPanel').classList.toggle('hidden', loggedIn);
  el('userPanel').classList.toggle('hidden', !loggedIn);
  el('dashboard').classList.toggle('hidden', !loggedIn);
  el('welcome').classList.toggle('hidden', loggedIn);

  if (loggedIn) {
    el('userName').textContent = state.user.name;
    el('userEmail').textContent = state.user.email;
    el('userRole').textContent = state.user.role;
    el('subtitle').textContent =
      state.user.role === 'admin'
        ? 'Admin view — showing tasks across all users.'
        : 'Your personal task board.';
  } else {
    el('subtitle').textContent = 'Log in or register to load your task board.';
  }
}

// ---------------------------------------------------------
// Task form: create / update
// ---------------------------------------------------------
const taskForm = el('taskForm');
const taskCancelBtn = el('taskCancelBtn');
const taskSubmitBtn = el('taskSubmitBtn');

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(taskForm);
  const payload = {
    title: form.get('title'),
    description: form.get('description') || '',
    status: form.get('status'),
    priority: form.get('priority'),
  };
  const dueDate = form.get('dueDate');
  if (dueDate) payload.dueDate = new Date(dueDate).toISOString();

  try {
    if (state.editingTaskId) {
      await apiRequest(`/tasks/${state.editingTaskId}`, { method: 'PUT', body: payload });
      showToast('Task updated', 'success');
    } else {
      await apiRequest('/tasks', { method: 'POST', body: payload });
      showToast('Task created', 'success');
    }
    resetTaskForm();
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

taskCancelBtn.addEventListener('click', resetTaskForm);

function resetTaskForm() {
  taskForm.reset();
  taskForm.elements.status.value = 'pending';
  taskForm.elements.priority.value = 'medium';
  state.editingTaskId = null;
  taskSubmitBtn.textContent = 'Add task';
  taskCancelBtn.classList.add('hidden');
}

// ---------------------------------------------------------
// Filters + pagination
// ---------------------------------------------------------
el('filterStatus').addEventListener('change', () => { state.page = 1; loadTasks(); });
el('filterPriority').addEventListener('change', () => { state.page = 1; loadTasks(); });
el('prevPage').addEventListener('click', () => {
  if (state.page > 1) { state.page -= 1; loadTasks(); }
});
el('nextPage').addEventListener('click', () => {
  if (state.page < state.totalPages) { state.page += 1; loadTasks(); }
});

// ---------------------------------------------------------
// Load + render tasks
// ---------------------------------------------------------
async function loadTasks() {
  const status = el('filterStatus').value;
  const priority = el('filterPriority').value;

  const params = new URLSearchParams({
    page: state.page,
    limit: state.limit,
  });
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);

  try {
    const res = await apiRequest(`/tasks?${params.toString()}`);
    renderTasks(res.data.tasks);
    state.totalPages = res.meta?.totalPages || 1;
    el('pageInfo').textContent = `Page ${res.meta?.page || 1} of ${state.totalPages}`;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderTasks(tasks) {
  const list = el('taskList');
  list.innerHTML = '';

  if (!tasks.length) {
    list.innerHTML = '<div class="empty-state">No tasks yet — add one above to get started.</div>';
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement('div');
    card.className = 'task-card';

    const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—';
    const ownerLabel = state.user.role === 'admin' && task.owner
      ? `<div class="task-owner">${task.owner.name} (${task.owner.email})</div>`
      : '';

    card.innerHTML = `
      <div class="task-main">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
        ${ownerLabel}
      </div>
      <span class="pill status-${task.status}">${task.status}</span>
      <span class="pill priority-${task.priority}">${task.priority}</span>
      <span class="pill" title="Due date">${due}</span>
      <button class="icon-btn" data-action="edit">Edit</button>
      <button class="icon-btn danger" data-action="delete">Delete</button>
    `;

    card.querySelector('[data-action="edit"]').addEventListener('click', () => editTask(task));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(task._id));

    list.appendChild(card);
  });
}

function editTask(task) {
  state.editingTaskId = task._id;
  taskForm.elements.title.value = task.title;
  taskForm.elements.description.value = task.description || '';
  taskForm.elements.status.value = task.status;
  taskForm.elements.priority.value = task.priority;
  taskForm.elements.dueDate.value = task.dueDate ? task.dueDate.slice(0, 10) : '';
  taskSubmitBtn.textContent = 'Save changes';
  taskCancelBtn.classList.remove('hidden');
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await apiRequest(`/tasks/${id}`, { method: 'DELETE' });
    showToast('Task deleted', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------
renderAuthState();
if (state.token) loadTasks();
