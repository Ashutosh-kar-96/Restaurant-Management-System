// api/table.api.js
import api from './axios';
export const tableApi = {
  getAll:        (bId)    => api.get(`/tables/branch/${bId}`),
  getById:       (id)     => api.get(`/tables/${id}`),
  create:        (bId, d) => api.post(`/tables/branch/${bId}`, d),
  update:        (id, d)  => api.put(`/tables/${id}`, d),
  remove:        (id)     => api.delete(`/tables/${id}`),
  updateStatus:  (id, st) => api.patch(`/tables/${id}/status`, { status: st }),
  regenerateQR:  (id, bId)=> api.post(`/tables/${id}/qr/${bId}`),
  getBookings:   (bId, p) => api.get(`/tables/bookings/branch/${bId}`, { params: p }),
  createBooking: (d)      => api.post('/tables/bookings', d),
  updateBooking: (id, d)  => api.patch(`/tables/bookings/${id}`, d),
};
