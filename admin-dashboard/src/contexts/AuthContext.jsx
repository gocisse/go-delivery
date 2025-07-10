import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token validity by checking user profile
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [token]);

  const checkAuth = async () => {
    try {
      // Try to get dashboard stats to verify auth
      // Your backend uses dev auth middleware, so any request should work
      const response = await api.get('/api/staff/dashboard/stats');
      
      // If successful, set a mock user (since we don't have a user endpoint)
      setUser({
        id: 'admin-user',
        email: 'admin@goexpress.com',
        role: 'admin',
        name: 'Admin User'
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      // Don't logout on 403 during initial check - backend might not be ready
      if (error.response?.status !== 403) {
        logout();
      } else {
        // For 403, still set user since backend uses dev auth
        setUser({
          id: 'admin-user',
          email: 'admin@goexpress.com',
          role: 'admin',
          name: 'Admin User'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Since your backend doesn't have a login endpoint and uses dev auth middleware,
      // we'll validate credentials locally and then test API access
      if (email === 'admin@goexpress.com' && password === 'admin123') {
        // Generate a mock token (your backend doesn't validate it anyway due to dev middleware)
        const mockToken = 'dev-admin-token-' + Date.now();
        
        localStorage.setItem('token', mockToken);
        setToken(mockToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        
        // Test API access to ensure backend is reachable
        try {
          await api.get('/health');
        } catch (healthError) {
          console.warn('Health check failed, but continuing with login:', healthError);
        }
        
        const mockUser = {
          id: 'admin-user',
          email: 'admin@goexpress.com',
          role: 'admin',
          name: 'Admin User'
        };
        
        setUser(mockUser);
        return { success: true, user: mockUser };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};