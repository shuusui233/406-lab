async function requestJson(url, options = {}) {
  const auth = localStorage.getItem('adminAuth');
  const headers = {
    Accept: 'application/json',
    ...options.headers
  };
  
  if (auth) {
    headers['Authorization'] = 'Basic ' + auth;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let result = null;

  try {
    result = await response.json();
  } catch (error) {
    throw new Error('接口返回的不是有效 JSON。');
  }

  if (!response.ok || !result.success) {
    throw new Error(result?.message || '接口请求失败。');
  }

  return result.data;
}

export function login(username, password) {
  return fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  }).then(res => res.json());
}

export function getUsers() {
  return requestJson('/api/users');
}

export function createUser(data) {
  return requestJson('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export function updateUser(id, data) {
  return requestJson(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export function deleteUser(id) {
  return requestJson(`/api/users/${id}`, {
    method: 'DELETE'
  });
}

export function getContents() {
  return requestJson('/api/contents');
}

export function updateContent(key, data) {
  return requestJson(`/api/contents/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export function getApplications() {
  return requestJson('/api/applications');
}

export function deleteApplication(id) {
  return requestJson(`/api/applications/${id}`, {
    method: 'DELETE'
  });
}

export function getProjects() {
  return requestJson('/api/projects/all');
}

export function createProject(data) {
  return requestJson('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export function updateProject(id, data) {
  return requestJson(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export function deleteProject(id) {
  return requestJson(`/api/projects/${id}`, {
    method: 'DELETE'
  });
}

export function getSettings() {
  return requestJson('/api/settings');
}

export function updateSettings(data) {
  return requestJson('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}