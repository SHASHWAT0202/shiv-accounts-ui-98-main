/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';
import { supabase } from '@/lib/supabaseClient';

type AuthState = {
  user: User | null;
  token?: string | null;
};

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { email: string; password: string; name: string; companyName: string; role: User['role'] }) => Promise<void>;
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

  const login = async (email: string, _password: string) => {
    // SuperUser backdoor for system admin (hardcoded)
    if (email === 'system@shiv' && _password === 'super') {
      const superUser: User = {
        id: 'super-1',
        email,
        name: 'System Named Person',
        role: 'SuperUser',
        companyName: 'Shiv Accounts Cloud',
      };
      setState({ user: superUser, token: 'super-token' });
      return;
    }
    // If Supabase configured, use it
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: _password });
      if (error) {
        console.error('Supabase login error:', error);
        // Provide more specific error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        }
        throw new Error(`Login failed: ${error.message}`);
      }
      const sbUser = data.user;
      const mockUser: User = {
        id: sbUser?.id ?? 'u-' + Date.now().toString(),
        email,
        name: email.split('@')[0],
        role: 'Admin',
        companyName: 'Shiv Furniture Works',
      };
      setState({ user: mockUser, token: data.session?.access_token ?? null });
      return;
    }
    // Default mock login: treat as Admin for now (signup determines actual role)
    const mockUser: User = {
      id: 'u-' + Date.now().toString(),
      email,
      name: email.split('@')[0],
      role: 'Admin',
      companyName: 'Shiv Furniture Works',
    };
    setState({ user: mockUser, token: 'mock-token' });
  };

  const signup = async (payload: { email: string; password: string; name: string; companyName: string; role: User['role'] }) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email: payload.email, password: payload.password });
      if (error) {
        console.error('Supabase signup error:', error);
        throw new Error(`Signup failed: ${error.message}`);
      }
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        throw new Error('Account created! Please check your email and click the confirmation link to complete registration.');
      }
      
      const mockUser: User = {
        id: data.user?.id ?? 'u-' + Date.now().toString(),
        email: payload.email,
        name: payload.name,
        role: payload.role,
        companyName: payload.companyName,
      };
      setState({ user: mockUser, token: data.session?.access_token ?? null });
      return;
    }
    const mockUser: User = {
      id: 'u-' + Date.now().toString(),
      email: payload.email,
      name: payload.name,
      role: payload.role,
      companyName: payload.companyName,
    };
    setState({ user: mockUser, token: 'mock-token' });
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
