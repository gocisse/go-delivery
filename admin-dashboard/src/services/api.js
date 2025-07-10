import axios from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Dashboard
  getDashboardStats: () => api.get('/api/staff/dashboard/stats'),
  
  // Orders
  getOrders: (params = {}) => api.get('/api/orders', { params }),
  getOrder: (id) => api.get(`/api/orders/${id}`),
  updateOrderStatus: (id, data) => api.put(`/api/orders/${id}/status`, data),
  assignOrder: (id, driverId) => api.put(`/api/orders/${id}/assign`, { driver_id: driverId }),
  
  // Drivers
  getDrivers: (params = {}) => api.get('/api/drivers', { params }),
  getDriver: (id) => api.get(`/api/drivers/${id}`),
  getAvailableDrivers: (params = {}) => api.get('/api/drivers/available', { params }),
  updateDriver: (id, data) => api.put(`/api/drivers/${id}`, data),
  
  // Customers
  getCustomers: (params = {}) => api.get('/api/customers', { params }),
  getCustomer: (id) => api.get(`/api/customers/${id}`),
  
  // Tracking
  getTracking: (orderId) => api.get(`/api/tracking/${orderId}`),
};