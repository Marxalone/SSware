const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

async function apiCall(endpoint, options = {}, token) {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  bot: {
    status: (token) => apiCall('/api/bot/status', {}, token),
    logs: (token) => apiCall('/api/bot/logs', {}, token),
    start: (token, phoneNumber) => apiCall('/api/bot/start', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    }, token),
    stop: (token) => apiCall('/api/bot/stop', { method: 'POST' }, token),
    restart: (token) => apiCall('/api/bot/restart', { method: 'POST' }, token),
  },
  admin: {
    overview: (token) => apiCall('/api/admin/overview', {}, token),
    users: (token) => apiCall('/api/admin/users', {}, token),
    stopBot: (token, userId) => apiCall(`/api/admin/bot/${userId}/stop`, { method: 'POST' }, token),
    restartBot: (token, userId) => apiCall(`/api/admin/bot/${userId}/restart`, { method: 'POST' }, token),
    stopAll: (token) => apiCall('/api/admin/bot/stopall', { method: 'POST' }, token),
    setRole: (token, userId, role) => apiCall(`/api/admin/user/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    }, token),
    deleteUser: (token, userId) => apiCall(`/api/admin/user/${userId}`, { method: 'DELETE' }, token),
    userLogs: (token, userId) => apiCall(`/api/admin/logs/${userId}`, {}, token),
  }
}
