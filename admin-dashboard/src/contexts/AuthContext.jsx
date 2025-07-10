import { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

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
      // Verify token validity by testing API access
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      console.log('Verifying token...');
      
      // Test API access with current token
      await apiService.healthCheck();
      
      // If health check passes, decode the mock token to get user info
      try {
        const decoded = JSON.parse(atob(token));
        setUser({
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          name: 'Admin User'
        });
        console.log('Token verified successfully');
      } catch (decodeError) {
        console.error('Failed to decode token:', decodeError);
        // Set default user if token decode fails but API works
        setUser({
          id: 'admin-user',
          email: 'admin@goexpress.com',
          role: 'admin',
          name: 'Admin User'
        });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // Clear invalid token
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email, password: '***' });
      
      const response = await apiService.login(email, password);
      
      console.log('Login successful:', response);
      
      // Store token and set user
      localStorage.setItem('token', response.token);
      setToken(response.token);
      setUser(response.user);
      
      return { success: true, user: response.user };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    console.log('Logging out...');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user && !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};