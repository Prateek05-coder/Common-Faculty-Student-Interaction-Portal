import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Set up axios defaults
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Set token in axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Verify token with backend
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/me`);
      
      if (response.data.success) {
        setUser(response.data.data);
        setIsAuthenticated(true);
      } else {
        // Invalid token
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Remove invalid token
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      
      // Only show error if it's not a network error on initial load
      if (error.response?.status !== 401) {
        console.error('Authentication verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/login`, {
        email: email.trim().toLowerCase(),
        password
      });

      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        
        // Store token
        localStorage.setItem('token', token);
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update state
        setUser(userData);
        setIsAuthenticated(true);
        
        console.log('✅ Login successful:', userData.email, userData.role);
        return { success: true, user: userData };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/register`, userData);

      if (response.data.success) {
        console.log('✅ Registration successful:', userData.email, userData.role);
        return { success: true, data: response.data };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Notify backend (optional)
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/logout`);
    } catch (error) {
      console.error('Logout notification failed:', error);
    } finally {
      // Always clear local state regardless of backend response
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('✅ Logged out successfully');
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (updatedUserData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...updatedUserData
    }));
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/change-password`, {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        toast.success('Password changed successfully');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Password change failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Password change failed';
      throw new Error(errorMessage);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/me`);
      
      if (response.data.success) {
        setUser(response.data.data);
        return response.data.data;
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If refresh fails due to auth, logout
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  // Demo accounts helper (REMOVE IN PRODUCTION)
  const getDemoAccounts = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/demo-accounts`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get demo accounts:', error);
      return [];
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    changePassword,
    refreshUser,
    checkAuth,
    getDemoAccounts // REMOVE IN PRODUCTION
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};