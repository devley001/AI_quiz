// ============================================
// FILE: src/services/api.js
// ============================================
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Backend returns {success: true, data: {...}, message: "..."}
    // Return the whole response so services can access both data and message
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized - only redirect if user is already logged in
      if (error.response.status === 401 && localStorage.getItem('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      
      // Return error message from backend
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // Network error
      return Promise.reject({ message: 'Network error. Please check your connection.' });
    } else {
      return Promise.reject({ message: error.message });
    }
  }
);

export default api;
