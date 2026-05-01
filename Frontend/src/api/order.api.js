import api from './axios';
export const orderApi = {
  create:          (d)         => api.post('/orders', d),
  getAll:          (bId, p)    => api.get(`/orders/branch/${bId}`, { params: p }),
  getKitchen:      (bId)       => api.get(`/orders/kitchen/${bId}`),
  getById:         (id)        => api.get(`/orders/${id}`),
  updateStatus:    (id, d)     => api.patch(`/orders/${id}/status`, d),
  markItemPrepared:(oId, iId)  => api.patch(`/orders/${oId}/items/${iId}/prepared`),
  cancel:          (id, reason)=> api.patch(`/orders/${id}/cancel`, { reason }),
};
