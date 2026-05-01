// api/axios.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let queue = [];
const processQueue = (err, token) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  queue = [];
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const rId = localStorage.getItem('restaurantId');
  const bId = localStorage.getItem('branchId');
  if (rId) config.headers['X-Restaurant-ID'] = rId;
  if (bId) config.headers['X-Branch-ID']     = bId;

  // CRITICAL FIX: Let axios/browser set Content-Type for FormData (includes boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => { queue.push({ resolve, reject }); })
          .then((t) => { orig.headers.Authorization = `Bearer ${t}`; return api(orig); });
      }
      orig._retry    = true;
      isRefreshing   = true;
      try {
        const rf = localStorage.getItem('refreshToken');
        if (!rf) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: rf });
        const { accessToken, refreshToken } = data.data;
        localStorage.setItem('accessToken',  accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(orig);
      } catch (e) {
        processQueue(e, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
