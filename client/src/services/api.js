import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const rt = localStorage.getItem('refreshToken');
      if (rt) {
        try {
          const { data } = await axios.post('/api/auth/refresh-token', { refreshToken: rt });
          localStorage.setItem('token', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const listingsAPI = {
  getAll: (p) => api.get('/listings', { params: p }),
  getById: (id) => api.get(`/listings/${id}`),
  getMy: () => api.get('/listings/supplier/my'),
  create: (d) => api.post('/listings', d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, d) => api.put(`/listings/${id}`, d),
  delete: (id) => api.delete(`/listings/${id}`),
};

export const bidsAPI = {
  place: (listingId, d) => api.post(`/listings/${listingId}/bids`, d),
  getForListing: (listingId) => api.get(`/listings/${listingId}/bids`),
  getMy: () => api.get('/bids/my'),
  accept: (id) => api.put(`/bids/${id}/accept`),
  reject: (id) => api.put(`/bids/${id}/reject`),
};

export const ordersAPI = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  dispatch: (id, d) => api.post(`/orders/${id}/dispatch`, d, { headers: { 'Content-Type': 'multipart/form-data' } }),
  confirmDelivery: (id) => api.post(`/orders/${id}/confirm-delivery`),
  dispute: (id, d) => api.post(`/orders/${id}/dispute`, d, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const paymentsAPI = {
  initiate: (orderId) => api.post(`/payments/initiate/${orderId}`),
  getStatus: (orderId) => api.get(`/payments/status/${orderId}`),
  getTransactions: () => api.get('/payments/transactions'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  toggleUserStatus: (id) => api.patch(`/admin/users/${id}/toggle-status`),
  verifyGST: (id, gst_verified = true) => api.patch(`/admin/users/${id}/verify-gst`, { gst_verified }),
  getUserActivity: (id, config = {}) => api.get(`/admin/users/${id}/activity`, config),
  getListings: () => api.get('/admin/listings'),
  getOrders: () => api.get('/admin/orders'),
  getTransactions: () => api.get('/admin/transactions'),
  getDisputes: () => api.get('/admin/disputes'),
  resolveDispute: (id, d) => api.post(`/admin/disputes/${id}/resolve`, d),
  getAnalytics: () => api.get('/admin/analytics'),
  getSupplierAnalytics: () => api.get('/admin/analytics/supplier'),
  getBuyerAnalytics: () => api.get('/admin/analytics/buyer'),
};

export const publicAPI = {
  getStats: () => api.get('/public/stats').then((r) => r.data),
};

export default api;
