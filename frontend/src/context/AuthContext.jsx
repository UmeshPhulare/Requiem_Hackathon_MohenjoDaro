// AuthContext.jsx — Persistent user authentication & session management
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('risklens_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('risklens_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Validate session against MongoDB backend on mount
  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await authApi.getMe();
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem('risklens_user', JSON.stringify(data.user));
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.warn('Session verification notice:', err.message);
        // If 401, clear credentials
        if (err.message.includes('401') || err.message.includes('token')) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    }

    verifySession();
  }, [token]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('risklens_token', data.token);
      localStorage.setItem('risklens_user', JSON.stringify(data.user));
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password, risk_preference = 'moderate') => {
    setLoading(true);
    try {
      const data = await authApi.register(name, email, password, risk_preference);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('risklens_token', data.token);
      localStorage.setItem('risklens_user', JSON.stringify(data.user));
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('risklens_token');
    localStorage.removeItem('risklens_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
