import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser  = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        // Decode the JWT payload (middle segment) to read the exp claim.
        // This is not a security check — the server always verifies the signature.
        // It's purely to avoid showing the authenticated UI for a split second
        // before the first API call returns 401 on an expired token.
        const payloadB64 = storedToken.split('.')[1];
        const payload    = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

        if (payload?.exp && payload.exp * 1000 > Date.now()) {
          // Token is still valid — restore session
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          // Token expired — clear storage silently, stay on login page
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch {
        // Malformed token — clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);


  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: jwtToken, user: userData } = response.data;

      // Save token and user details to localStorage
      localStorage.setItem('token', jwtToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(jwtToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      const status     = error.response?.status;
      const data       = error.response?.data || {};
      const message    = data.error || 'Invalid email or password.';
      const retryAfter = data.retry_after ?? null;
      return { success: false, status, error: message, retryAfter };
    }
  };


  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
