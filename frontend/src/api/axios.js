import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (window.location.origin + '/api/v1'),
  headers: { 'Content-Type': 'application/json' },
});

// Outbound request interceptor for authenticating requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor for session expiration
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');

    // 401 on any non-login request = session expired → redirect to login
    if (status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // 429 (rate-limited) passes through to the caller (LoginPage handles the message)
    return Promise.reject(error);
  }
);


export default api;
