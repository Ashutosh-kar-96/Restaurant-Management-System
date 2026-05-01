import api from './axios';
export const restaurantApi = {
  getAll:          (p)              => api.get('/restaurants', { params: p }),
  getById:         (id)             => api.get(`/restaurants/${id}`),
  create:          (d)              => api.post('/restaurants', d),
  update:          (id, d)          => api.put(`/restaurants/${id}`, d),
  remove:          (id)             => api.delete(`/restaurants/${id}`),
  getBranches:     (id)             => api.get(`/restaurants/${id}/branches`),
  createBranch:    (id, d)          => api.post(`/restaurants/${id}/branches`, d),
  updateBranch:    (id, bid, d)     => api.put(`/restaurants/${id}/branches/${bid}`, d),
  deleteBranch:    (id, bid)        => api.delete(`/restaurants/${id}/branches/${bid}`),
  getStaff:        (id)             => api.get(`/restaurants/${id}/staff`),
  addStaff:        (id, d)          => api.post(`/restaurants/${id}/staff`, d),
  updateStaffRole: (id, uid, d)     => api.patch(`/restaurants/${id}/staff/${uid}/role`, d),
  removeStaff:     (id, uid)        => api.delete(`/restaurants/${id}/staff/${uid}`),
};
