import * as SecureStore from 'expo-secure-store';
import type { Session } from './types';

const sessionKey = 'vetwise.mobile.session';
export async function saveSession(session: Session): Promise<void> { await SecureStore.setItemAsync(sessionKey, JSON.stringify(session)); }
export async function getSession(): Promise<Session | null> { const value = await SecureStore.getItemAsync(sessionKey); return value ? JSON.parse(value) as Session : null; }
export async function clearSession(): Promise<void> { await SecureStore.deleteItemAsync(sessionKey); }
