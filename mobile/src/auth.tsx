import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { api, decodeUser } from './api';
import { clearSession, getSession, saveSession } from './storage';
import type { AuthUser, Role, Session } from './types';

type AuthContextValue = { user: AuthUser | null; loading: boolean; loginWithOtp: (phone: string, otpId: string, code: string, purpose: 'login' | 'register', registrationData?: { name: string; email: string; role: Role }) => Promise<string | null>; loginWithPassword: (identifier: string, password: string) => Promise<string | null>; sendOtp: (phone: string, purpose: 'login' | 'register') => Promise<{ otpId?: string; error?: string }>; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getSession().then((session) => { setUser(session ? decodeUser(session.idToken) : null); }).finally(() => setLoading(false)); }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    sendOtp: async (phone, purpose) => { try { return { otpId: (await api.sendOtp(phone, purpose)).otpId }; } catch (error) { return { error: error instanceof Error ? error.message : 'Could not send code' }; } },
    loginWithOtp: async (phone, otpId, code, purpose, registrationData) => { try { const result = await api.verifyOtp({ otpId, code, phone, purpose, registrationData }); const session: Session = { accessToken: result.accessToken, idToken: result.idToken, refreshToken: result.refreshToken, expiresIn: result.expiresIn }; await saveSession(session); const nextUser = decodeUser(session.idToken); if (!nextUser) return 'We could not load your profile'; setUser(nextUser); return null; } catch (error) { return error instanceof Error ? error.message : 'Verification failed'; } },
    loginWithPassword: async (identifier, password) => { try { const session = await api.passwordLogin(identifier, password); await saveSession(session); const nextUser = decodeUser(session.idToken); if (!nextUser) return 'We could not load your profile'; setUser(nextUser); return null; } catch (error) { return error instanceof Error ? error.message : 'Sign in failed'; } },
    logout: async () => { await clearSession(); setUser(null); },
  }), [loading, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
