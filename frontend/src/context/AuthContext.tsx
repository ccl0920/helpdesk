import { createContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { Role } from '@/lib/role';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
}

interface Session {
  user: User;
  expiresAt: Date;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Better Auth returns { session, user } separately
        if (data.session && data.user) {
          setSession({
            user: data.user,
            expiresAt: data.session.expiresAt,
          });
        } else {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let errorMessage = 'Invalid email or password';
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Response might be empty on server errors
        errorMessage = 'Login failed. Please try again.';
      }
      throw new Error(errorMessage);
    }

    await refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await fetch(`${API_BASE_URL}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
    setSession(null);
  }, []);

  const value: AuthContextType = {
    user: session?.user ?? null,
    session,
    isAuthenticated: !!session,
    isAdmin: session?.user?.role === Role.ADMIN,
    isLoading,
    login,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
