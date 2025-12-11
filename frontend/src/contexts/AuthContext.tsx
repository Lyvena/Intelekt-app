import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import type { User, AuthContextType } from '../types';
import { setTokenGetter } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();

  // Register token getter with API service
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Map Clerk user to our User type
  const user: User | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    username: clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress || '',
    full_name: clerkUser.fullName || undefined,
    is_active: true,
    is_superuser: false,
    created_at: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
  } : null;

  const logout = async () => {
    await signOut();
  };

  const value: AuthContextType = {
    user,
    token: null, // Token is handled by Clerk internally
    getToken, // Expose getToken for API calls
    logout,
    isAuthenticated: isSignedIn || false,
    isLoading: !isLoaded,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
