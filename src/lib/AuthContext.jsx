import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, supabase } from '@/api/base44Client';
import { SUPABASE_AUTH_ENABLED, getFallbackAdmin } from '@/lib/auth-config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!SUPABASE_AUTH_ENABLED) {
      setUser(getFallbackAdmin());
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthError(null);
      return;
    }
    refreshAuth();
    const { data } = supabase.auth.onAuthStateChange(() => {
      refreshAuth();
    });
    return () => data?.subscription?.unsubscribe();
  }, []);

  const refreshAuth = async () => {
    try {
      if (!SUPABASE_AUTH_ENABLED) {
        setUser(getFallbackAdmin());
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        setAuthError(null);
        return;
      }
      setIsLoadingAuth(true);
      setAuthError(null);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(Boolean(currentUser));
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Auth refresh failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      await base44.auth.logout(window.location.href);
    } else {
      await base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
