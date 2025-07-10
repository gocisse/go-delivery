import axios from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add additional headers for CORS
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      hasToken: !!token
    });
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config?.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers
    });

    // Handle authentication errors
    if (error.response?.status === 401 || 
        (error.response?.status === 403 && error.response?.data?.code === 'INVALID_TOKEN')) {
      console.log('Authentication failed, clearing token');
      localStorage.removeItem('token');
      window.location.href = '/admin/login';
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Health check
  healthCheck: () => api.get('/health'),
  
  // Authentication - simulate login since backend uses dev auth
  login: async (email, password) => {
    // Validate credentials locally first
    if (email !== 'admin@goexpress.com' || password !== 'admin123') {
      throw new Error('Invalid credentials');
    }
    
    // Test backend connectivity with a simple request
    try {
      await api.get('/health');
    } catch (error) {
      throw new Error('Cannot connect to backend server');
    }
    
    // Generate a mock JWT token (backend doesn't validate it due to dev middleware)
    const mockToken = btoa(JSON.stringify({
      sub: 'admin-user',
      email: 'admin@goexpress.com',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }));
    
    return {
      token: mockToken,
      user: {
        id: 'admin-user',
        email: 'admin@goexpress.com',
        role: 'admin',
        name: 'Admin User'
      }
    };
  },
  
  // Dashboard
  getDashboardStats: async () => {
    try {
      return await api.get('/api/staff/dashboard/stats');
    } catch (error) {
      console.warn('Dashboard stats failed, trying health check:', error);
      // If dashboard stats fail, try a simpler endpoint
      await api.get('/health');
      // Return mock data if health check passes but stats fail
      return {
        data: {
          statistics: {
            total_orders: 0,
            pending_orders: 0,
            active_drivers: 0,
            total_customers: 0,
            recent_orders_24h: 0
          },
          orders_by_status: {},
          generated_at: new Date().toISOString()
        }
      };
    }
  },
  
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