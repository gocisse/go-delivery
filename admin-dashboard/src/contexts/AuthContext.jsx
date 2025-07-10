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
      await api.get('/api/staff/dashboard/stats');
      
      // If successful, set a mock user (since we don't have a user endpoint)
      setUser({
        id: 'admin-user',
        email: 'admin@goexpress.com',
        role: 'admin',
        name: 'Admin User'
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Since your backend doesn't have a login endpoint, we'll simulate it
      // In a real app, this would call your auth endpoint
      if (email === 'admin@goexpress.com' && password === 'admin123') {
        // Generate a mock token (in real app, this comes from backend)
        const mockToken = 'mock-jwt-token-for-demo';
        
        localStorage.setItem('token', mockToken);
        setToken(mockToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        
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