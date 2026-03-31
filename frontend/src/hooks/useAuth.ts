'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/api';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user;

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = hasRole(UserRole.ADMIN, UserRole.PAYROLL_ADMIN);
  const canApprove = hasRole(UserRole.ADMIN, UserRole.PAYROLL_ADMIN, UserRole.APPROVER);
  const canViewDeveloper = hasRole(UserRole.ADMIN, UserRole.PAYROLL_ADMIN);

  const logout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const login = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/');
      return { success: true };
    }

    return { success: false, error: result?.error || 'Login failed' };
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    isAdmin,
    canApprove,
    canViewDeveloper,
    hasRole,
    login,
    logout,
  };
}
