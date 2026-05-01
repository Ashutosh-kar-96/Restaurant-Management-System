import api from './axios';
export const billingApi = {
  generateBill:   (orderId) => api.get(`/billing/order/${orderId}`),
  processPayment: (d)       => api.post('/billing/pay', d),
  getInvoice:     (id)      => api.get(`/billing/invoice/${id}`),
  getPayments:    (bId, p)  => api.get(`/billing/branch/${bId}`, { params: p }),
};
