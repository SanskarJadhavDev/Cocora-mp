import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, getToken, setToken, getUser, setUser, clearSession } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setCurrentUser] = useState(() => getUser());
  const [token, setCurrentToken] = useState(() => getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const activeToken = getToken();
      if (!activeToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        if (response && response.user) {
          setCurrentUser(response.user);
          setUser(response.user);
        }
      } catch {
        clearSession();
        setCurrentToken('');
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();

    const handleAuthExpired = () => {
      setCurrentToken('');
      setCurrentUser(null);
      clearSession();
    };

    window.addEventListener('cocora:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('cocora:auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    if (response && response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      setCurrentToken(response.token);
      setCurrentUser(response.user);
      return response.user;
    }
    throw new Error('Login response missing authentication details');
  };

  const register = async (name, email, password) => {
    const response = await authApi.register({ name, email, password });
    return response;
  };

  const logout = () => {
    clearSession();
    setCurrentToken('');
    setCurrentUser(null);
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout
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
