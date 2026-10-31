'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@finpilot/shared';
import { api, ApiError } from '@/lib/api-client';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery<AuthUser | null>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const res = await api.get<{ user?: AuthUser } | AuthUser>('/api/v1/auth/me');
        if ('user' in res && res.user) {
          return res.user;
        }
        return res as AuthUser;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return null;
        }
        // Network or server error
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ user?: AuthUser } | AuthUser>('/api/v1/auth/login', {
        email,
        password,
      });
      const authUser = ('user' in res && res.user) ? res.user : (res as AuthUser);
      queryClient.setQueryData(['auth-me'], authUser);
      router.push('/customers');
    },
    [queryClient, router],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      queryClient.setQueryData(['auth-me'], null);
      queryClient.clear();
      router.push('/login');
    }
  }, [queryClient, router]);

  const refetchUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refetchUser,
    }),
    [user, isLoading, login, logout, refetchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

