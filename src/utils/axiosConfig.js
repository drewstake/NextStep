import axios from 'axios';
import { API_SERVER } from '../config';

// Use this component to make requests to the server
// it will handle token expiration and redirect to login page

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_SERVER,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage or your auth context
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add companyId to headers if it exists in localStorage
    const companyId = localStorage.getItem('companyId');
    if (companyId) {
      config.headers['X-Company-ID'] = companyId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Clear any stored auth data
          localStorage.removeItem('token');
          // Redirect to login page
          window.location.href = '/login';
          break;
        default:
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance; 