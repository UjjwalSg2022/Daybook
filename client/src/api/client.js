import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('daybook_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token is invalid/expired, drop it and send the user back to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('daybook_token');
      if (window.location.pathname !== '/login') {
        window.location.href = import.meta.env.PROD ? '/daybook/login' : '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
