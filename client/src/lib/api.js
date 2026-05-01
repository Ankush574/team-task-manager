const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || data.errors?.[0]?.message || 'Something went wrong';
    throw new Error(msg);
  }
  return data;
}

export const api = {
  // Auth
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id, body) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: (projectId) => request(`/projects/${projectId}/members`),
  addMember: (projectId, body) => request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateMember: (projectId, memberId, body) => request(`/projects/${projectId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeMember: (projectId, memberId) => request(`/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (projectId, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/projects/${projectId}/tasks${q ? '?' + q : ''}`);
  },
  createTask: (projectId, body) => request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  getTask: (taskId) => request(`/tasks/${taskId}`),
  updateTask: (taskId, body) => request(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: () => request('/dashboard'),
};
