import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Set Authorization Header Helper
  const setAuthHeader = (authToken: string | null) => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('signy_user');
    const storedToken = localStorage.getItem('signy_token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      setAuthHeader(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token: newConfigToken, user: loggedUser } = response.data;
      
      setUser(loggedUser);
      setToken(newConfigToken);
      setAuthHeader(newConfigToken);

      localStorage.setItem('signy_user', JSON.stringify(loggedUser));
      localStorage.setItem('signy_token', newConfigToken);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Login failed. Please check your credentials.';
      throw new Error(errorMsg);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, { name, email, password });
      const { token: newConfigToken, user: registeredUser } = response.data;

      setUser(registeredUser);
      setToken(newConfigToken);
      setAuthHeader(newConfigToken);

      localStorage.setItem('signy_user', JSON.stringify(registeredUser));
      localStorage.setItem('signy_token', newConfigToken);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Registration failed.';
      throw new Error(errorMsg);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthHeader(null);
    localStorage.removeItem('signy_user');
    localStorage.removeItem('signy_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
