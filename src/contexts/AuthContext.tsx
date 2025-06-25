'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: string;
  provider: string;
  created_at: string;
  updated_at: string;
  credits: {
    total_tokens: number;
    used_tokens: number;
    remaining_tokens: number;
    last_reset?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (provider: 'google' | 'github') => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 * Manages user authentication state and provides auth methods
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user profile from API
   */
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const profile = await response.json();
        setUser(profile);
      } else if (response.status === 401) {
        // User is not authenticated
        setUser(null);
      } else {
        console.error('Failed to fetch profile:', response.status, response.statusText);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initialize authentication state on mount
   */
  useEffect(() => {
    fetchProfile();
  }, []);

  /**
   * Login with OAuth provider
   */
  const login = (provider: 'google' | 'github') => {
    // Redirect to authentication endpoint
    window.location.href = `/api/auth/${provider}`;
  };

  /**
   * Logout user and clear session
   */
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setUser(null);
        // Redirect to home page
        window.location.href = '/';
      } else {
        console.error('Logout failed:', response.status, response.statusText);
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  /**
   * Refresh user profile data
   */
  const refreshProfile = async () => {
    setLoading(true);
    await fetchProfile();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Higher-order component to protect routes that require authentication
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">載入中...</span>
          </div>
        </div>
      );
    }

    if (!user) {
      // Redirect to login or show login form
      window.location.href = '/auth/login';
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * Component to show loading state
 */
export function AuthLoadingSpinner() {
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">載入中...</span>
      </div>
    </div>
  );
}