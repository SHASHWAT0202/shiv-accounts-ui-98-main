/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { ROLES, DEFAULT_SIGNUP_ROLE, getDashboardRoute } from '@/lib/roles';

type AuthState = {
  user: User | null;
  token?: string | null;
};

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<string>; // Return dashboard route
  signup: (payload: { email: string; password: string; name: string; companyName: string; role: User['role'] }) => Promise<string>; // Return dashboard route
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_KEY = 'shiv-accounts-auth-v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null });

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthState;
        setState({ ...parsed, user: parsed.user });
      } catch (e) {
        // If parsing fails, clear the stored auth to avoid loops
        console.warn('Failed to parse auth state', e);
        localStorage.removeItem(AUTH_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  }, [state]);

  const login = async (email: string, password: string): Promise<string> => {
    try {
      // Use backend authentication
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        companyName: data.user.companyName,
      };

      setState({ user, token: data.token });
      return getDashboardRoute(user.role);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (payload: { email: string; password: string; name: string; companyName: string; role: User['role'] }): Promise<string> => {
    try {
      // Use backend authentication
      const response = await fetch('http://localhost:3001/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        companyName: data.user.companyName,
      };

      setState({ user, token: data.token });
      return getDashboardRoute(user.role);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    setState({ user: null, token: null });
    localStorage.removeItem(AUTH_KEY);
  };

  const value = useMemo<AuthContextValue>(() => ({ user: state.user, login, signup, logout }), [state.user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// A simple guard component for routes
export function ProtectedRoute({ children, redirectTo = '/login' }: { children: React.ReactNode; redirectTo?: string }) {
  const { user } = useAuth();
  if (!user) {
    // Returning a plain anchor keeps it simple without hooks here
    window.location.href = redirectTo;
    return null;
  }
  return <>{children}</>;
}
