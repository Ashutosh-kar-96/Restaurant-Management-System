import api from './axios';
export const inventoryApi = {
  getAll:         (bId)    => api.get(`/inventory/branch/${bId}`),
  getById:        (id)     => api.get(`/inventory/${id}`),
  create:         (bId, d) => api.post(`/inventory/branch/${bId}`, d),
  update:         (id, d)  => api.put(`/inventory/${id}`, d),
  restock:        (id, d)  => api.post(`/inventory/${id}/restock`, d),
  getLowStock:    (bId)    => api.get(`/inventory/low-stock/${bId}`),
  getSuppliers:   ()       => api.get('/inventory/suppliers'),
  createSupplier: (d)      => api.post('/inventory/suppliers', d),
};
