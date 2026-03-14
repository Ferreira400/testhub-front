import axios from 'axios'
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('testhub_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      const user = localStorage.getItem('testhub_user')
      try {
        const parsed = JSON.parse(user || '{}')
        if (parsed.source === 'keycloak') {
          // Token Keycloak expirado — limpa e vai para login (sem loop pois Login nao redireciona se tiver token)
          localStorage.removeItem('testhub_token')
          localStorage.removeItem('testhub_user')
          localStorage.removeItem('kc_refresh_token')
          localStorage.removeItem('kc_id_token')
          window.location.href = '/login'
          return Promise.reject(err)
        }
      } catch (_) {}
      localStorage.removeItem('testhub_token')
      localStorage.removeItem('testhub_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
export const auth = {
  login:    d => api.post('/auth/login', d),
  register: d => api.post('/auth/register', d),
  me:       () => api.get('/auth/me'),
}
export const users = {
  list:    () => api.get('/users'),
  getById: id => api.get(`/users/${id}`),
}
export const squads = {
  list:         ()        => api.get('/squads'),
  getById:      id        => api.get(`/squads/${id}`),
  create:       d         => api.post('/squads', d),
  update:       (id, d)   => api.put(`/squads/${id}`, d),
  addMember:    (id, d)   => api.post(`/squads/${id}/members`, d),
  removeMember: (id, uid) => api.delete(`/squads/${id}/members/${uid}`),
}
export const projects = {
  list:    p      => api.get('/projects', { params: p }),
  getById: id     => api.get(`/projects/${id}`),
  create:  d      => api.post('/projects', d),
  update:  (id,d) => api.put(`/projects/${id}`, d),
}
export const testCases = {
  list:    p      => api.get('/test-cases', { params: p }),
  getById: id     => api.get(`/test-cases/${id}`),
  create:  d      => api.post('/test-cases', d),
  update:  (id,d) => api.put(`/test-cases/${id}`, d),
  remove:  id     => api.delete(`/test-cases/${id}`),
}
export const testCycles = {
  list:    p      => api.get('/test-cycles', { params: p }),
  getById: id     => api.get(`/test-cycles/${id}`),
  create:  d      => api.post('/test-cycles', d),
  update:  (id,d) => api.put(`/test-cycles/${id}`, d),
}
export const executions = {
  list:    p      => api.get('/executions', { params: p }),
  getById: id     => api.get(`/executions/${id}`),
  create:  d      => api.post('/executions', d),
  update:  (id,d) => api.put(`/executions/${id}`, d),
}
export const reports = {
  dashboard: p      => api.get('/reports/dashboard', { params: p }),
  byCycle:   id     => api.get(`/reports/cycle/${id}`),
  bySquad:   (id,p) => api.get(`/reports/squad/${id}`, { params: p }),
}
export default api
