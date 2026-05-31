import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  createUser: (data) => api.post('/auth/create-user', data).then(r => r.data),
  listUsers: () => api.get('/auth/users').then(r => r.data)
};

export const invoices = {
  list: (params) => api.get('/facturas', { params }).then(r => r.data),
  get: (id) => api.get(`/facturas/${id}`).then(r => r.data),
  create: (data) => api.post('/facturas', data).then(r => r.data),
  update: (id, data) => api.put(`/facturas/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/facturas/${id}`).then(r => r.data),
  resumen: (params) => api.get('/facturas/resumen', { params }).then(r => r.data)
};

export const companies = {
  list: () => api.get('/empresas').then(r => r.data),
  get: (id) => api.get(`/empresas/${id}`).then(r => r.data),
  search: (q) => api.get('/empresas/search', { params: { q } }).then(r => r.data),
  create: (data) => api.post('/empresas', data).then(r => r.data),
  update: (id, data) => api.put(`/empresas/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/empresas/${id}`).then(r => r.data)
};

export const budgets = {
  list: (params) => api.get('/presupuestos', { params }).then(r => r.data),
  get: (id) => api.get(`/presupuestos/${id}`).then(r => r.data),
  create: (data) => api.post('/presupuestos', data).then(r => r.data),
  update: (id, data) => api.put(`/presupuestos/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/presupuestos/${id}`).then(r => r.data)
};

export const branches = {
  list: () => api.get('/sucursales').then(r => r.data),
  create: (data) => api.post('/sucursales', data).then(r => r.data),
  update: (id, data) => api.put(`/sucursales/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/sucursales/${id}`).then(r => r.data)
};

export const books = {
  list: (q) => api.get('/libros', { params: { q } }).then(r => r.data),
  create: (data) => api.post('/libros', data).then(r => r.data),
  update: (id, data) => api.put(`/libros/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/libros/${id}`).then(r => r.data),
  ventas: (params) => api.get('/libros/ventas', { params }).then(r => r.data),
  crearVenta: (data) => api.post('/libros/ventas', data).then(r => r.data),
  eliminarVenta: (id) => api.delete(`/libros/ventas/${id}`).then(r => r.data),
  actualizarVenta: (id, data) => api.put(`/libros/ventas/${id}`, data).then(r => r.data)
};

export default api;
