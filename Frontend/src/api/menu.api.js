// api/menu.api.js
import api from './axios';

export const menuApi = {
  getCategories:      (rId)    => api.get(`/menus/${rId}/categories`),
  createCategory:     (rId, d) => api.post(`/menus/${rId}/categories`, d),
  updateCategory:     (id, d)  => api.put(`/menus/categories/${id}`, d),
  deleteCategory:     (id)     => api.delete(`/menus/categories/${id}`),
  getItems:           (rId, p) => api.get(`/menus/${rId}/items`, { params: p }),
  getItem:            (id)     => api.get(`/menus/items/${id}`),
  // DO NOT set Content-Type manually for FormData — axios sets it with correct boundary
  createItem:         (rId, d) => api.post(`/menus/${rId}/items`, d),
  updateItem:         (id, d)  => api.put(`/menus/items/${id}`, d),
  deleteItem:         (id)     => api.delete(`/menus/items/${id}`),
  toggleAvailability: (id)     => api.patch(`/menus/items/${id}/toggle`),
};
