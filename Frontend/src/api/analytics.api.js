import api from './axios';
export const analyticsApi = {
  getDashboard:        (bId, date) => api.get(`/analytics/dashboard/${bId}`, { params: { date } }),
  getRevenue:          (bId, p)    => api.get(`/analytics/revenue/${bId}`, { params: p }),
  getStaffPerformance: (bId, p)    => api.get(`/analytics/staff/${bId}`, { params: p }),
  getInventoryReport:  (bId)       => api.get(`/analytics/inventory/${bId}`),
  getPlatformRevenue:  (p)         => api.get('/analytics/platform/revenue', { params: p }),
};
