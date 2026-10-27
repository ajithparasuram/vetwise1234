/**
 * VetWise Auth Layer
 *
 * Uses AWS Cognito via the backend API (src/lib/api.ts).
 * Role comes from the Cognito custom:role claim in the JWT idToken.
 * The frontend never sends or trusts ownerId, hospitalId or tenant IDs.
 */

import { api, storeSession, clearSession, getStoredSession, decodeJwt, getStoredUser } from './api';

export type Role = 'client' | 'doctor' | 'admin' | 'frontdesk';

export interface AuthUser {
  sub: string;
  role: Role;
  email: string;
  phone: string;
  name: string;
  approvalStatus: string;
}

function adaptUser(u: ReturnType<typeof getStoredUser>): AuthUser | null {
  if (!u) return null;
  return {
    sub: u.sub,
    role: u.role,
    email: u.email ?? '',
    phone: u.phone ?? '',
    name: u.name ?? '',
    approvalStatus: u.approvalStatus ?? 'active',
  };
}

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function signUp(params: {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: Role;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const result = await api.signup(params);
    storeSession({
      accessToken: result.accessToken,
      idToken: result.idToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
    const user = adaptUser(getStoredUser());
    if (!user) return { user: null, error: 'Account created, but we could not read your profile. Please sign in.' };
    if (user.approvalStatus === 'pending') {
      clearSession();
      return { user: null, error: 'Your account is pending admin approval. You will be notified once approved.' };
    }
    return { user, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Sign-up failed' };
  }
}

export async function signInWithPassword(
  identifier: string,
  password: string,
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const session = await api.login({ identifier, password });
    storeSession(session);
    const user = adaptUser(getStoredUser());
    if (!user) return { user: null, error: 'Failed to read user profile from token.' };
    if (user.approvalStatus === 'pending') {
      clearSession();
      return { user: null, error: 'Your account is pending admin approval. You will be notified once approved.' };
    }
    if (user.approvalStatus === 'rejected') {
      clearSession();
      return { user: null, error: 'Your account application was rejected. Please contact support.' };
    }
    return { user, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Sign-in failed' };
  }
}

export async function sendOtp(
  identifier: string,
  channel?: string,
): Promise<{ session: string | null; error: string | null }> {
  try {
    const result = await api.sendOtp({ identifier, channel });
    return { session: result.session ?? null, error: null };
  } catch (err) {
    return { session: null, error: err instanceof Error ? err.message : 'Failed to send OTP' };
  }
}

export async function verifyOtp(
  session: string,
  code: string,
  identifier?: string,
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const result = await api.verifyOtp({ session, code, identifier });
    storeSession(result);
    const user = adaptUser(getStoredUser());
    if (!user) return { user: null, error: 'Failed to read user profile from token.' };
    if (user.approvalStatus === 'pending') {
      clearSession();
      return { user: null, error: 'Your account is pending admin approval.' };
    }
    return { user, error: null };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Verification failed' };
  }
}

export async function signOut(): Promise<void> {
  clearSession();
}

export function getCurrentUser(): AuthUser | null {
  return adaptUser(getStoredUser());
}

export function getCurrentSession(): AuthSession | null {
  return getStoredSession();
}

export function onAuthStateChange(
  _callback: (user: AuthUser | null) => void,
): () => void {
  return () => {};
}
