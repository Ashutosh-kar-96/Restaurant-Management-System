// api/auth.api.js
import api from './axios';

export const authApi = {
  login:          (d)   => api.post('/auth/login', d),
  register:       (d)   => api.post('/auth/register', d),
  logout:         ()    => api.post('/auth/logout'),
  refresh:        (rt)  => api.post('/auth/refresh', { refreshToken: rt }),
  profile:        ()    => api.get('/auth/profile'),
  updateProfile:  (d)   => api.patch('/auth/profile', d),
  changePassword: (d)   => api.patch('/auth/change-password', d),
  getAllUsers:     (p)   => api.get('/auth/users', { params: p }),
  toggleUser:     (id)  => api.patch(`/auth/users/${id}/toggle`),
  searchUsers:    (q)   => api.get('/auth/users/search', { params: { q } }),
};
