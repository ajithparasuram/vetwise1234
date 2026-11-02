import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/auth';
import { colors, radius, shadow, spacing } from '@/theme';
import type { Role } from '@/types';

function phoneForWa(phone: string): string { const digits = phone.replace(/\D/g, ''); return digits.length === 10 ? `+91${digits}` : phone; }

export default function Login() {
  const { user, sendOtp, loginWithOtp, loginWithPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'whatsapp' | 'password'>('whatsapp');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) { router.replace('/(tabs)/home'); return null; }
  const reset = () => { setOtpId(null); setCode(''); setError(''); };
  const requestCode = async () => {
    if (mode === 'register' && (!name.trim() || !email.includes('@'))) { setError('Enter your name and a valid email first.'); return; }
    if (phone.replace(/\D/g, '').length !== 10) { setError('Enter a valid 10-digit Indian mobile number.'); return; }
    setBusy(true); setError('');
    const result = await sendOtp(phoneForWa(phone), mode === 'register' ? 'register' : 'login');
    setBusy(false);
    if (result.error) setError(result.error); else setOtpId(result.otpId ?? null);
  };
  const verify = async () => {
    if (!otpId || code.length !== 6) { setError('Enter the 6-digit code sent to WhatsApp.'); return; }
    setBusy(true); setError('');
    const nextError = await loginWithOtp(phoneForWa(phone), otpId, code, mode === 'register' ? 'register' : 'login', mode === 'register' ? { name, email, role } : undefined);
    setBusy(false); if (nextError) setError(nextError); else router.replace('/(tabs)/home');
  };
  const passwordSignIn = async () => { if (!identifier || !password) { setError('Enter your email and password.'); return; } setBusy(true); setError(''); const nextError = await loginWithPassword(identifier, password); setBusy(false); if (nextError) setError(nextError); else router.replace('/(tabs)/home'); };

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <View style={styles.brandRow}><View style={styles.brandMark}><Ionicons name="paw" size={22} color={colors.surface} /></View><Text style={styles.brand}>VetWise</Text></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>CARE, CONNECTED</Text><Text style={styles.title}>{mode === 'login' ? 'A calmer way to care.' : 'Start their best care journey.'}</Text><Text style={styles.subtitle}>{mode === 'login' ? 'Your pets, patients, and practice — in one thoughtful mobile experience.' : 'Create your VetWise account with a verified WhatsApp number.'}</Text></View>
    <View style={styles.card}>
      <View style={styles.segment}><Pressable onPress={() => { setMode('login'); reset(); }} style={[styles.segmentItem, mode === 'login' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Sign in</Text></Pressable><Pressable onPress={() => { setMode('register'); setMethod('whatsapp'); reset(); }} style={[styles.segmentItem, mode === 'register' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Create account</Text></Pressable></View>
      {mode === 'register' && <><Text style={styles.sectionTitle}>Your details</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={colors.muted} /><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.muted} /><View style={styles.roleRow}><Pressable onPress={() => setRole('client')} style={[styles.roleChip, role === 'client' && styles.roleChipActive]}><Text style={[styles.roleText, role === 'client' && styles.roleTextActive]}>Pet owner</Text></Pressable><Pressable onPress={() => setRole('doctor')} style={[styles.roleChip, role === 'doctor' && styles.roleChipActive]}><Text style={[styles.roleText, role === 'doctor' && styles.roleTextActive]}>Doctor</Text></Pressable></View><Text style={styles.helper}>Admin and Front Desk accounts are created by an administrator.</Text></>}
      {mode === 'login' && <View style={styles.methodRow}><Pressable onPress={() => { setMethod('whatsapp'); reset(); }} style={[styles.methodItem, method === 'whatsapp' && styles.methodActive]}><Ionicons name="logo-whatsapp" size={16} color={method === 'whatsapp' ? colors.greenDeep : colors.muted} /><Text style={[styles.methodText, method === 'whatsapp' && styles.methodTextActive]}>WhatsApp OTP</Text></Pressable><Pressable onPress={() => { setMethod('password'); reset(); }} style={[styles.methodItem, method === 'password' && styles.methodActive]}><Ionicons name="key-outline" size={16} color={method === 'password' ? colors.blue : colors.muted} /><Text style={[styles.methodText, method === 'password' && styles.methodTextActive]}>Password</Text></Pressable></View>}
      {error ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={17} color={colors.red} /><Text style={styles.errorText}>{error}</Text></View> : null}
      {(method === 'whatsapp' || mode === 'register') && <><Text style={styles.label}>{otpId ? 'Verification code' : 'Mobile number'}</Text>{!otpId ? <><TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="9876543210" keyboardType="phone-pad" placeholderTextColor={colors.muted} /><Text style={styles.helper}>{mode === 'register' ? 'A 6-digit code is required to create your account.' : 'We will send a secure code to your WhatsApp.'}</Text></> : <><TextInput style={styles.otpInput} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" keyboardType="number-pad" maxLength={6} placeholderTextColor={colors.muted} /><Text style={styles.helper}>Code sent to {phoneForWa(phone)}. It expires in 5 minutes.</Text></>}</>}
      {method === 'password' && mode === 'login' && <><Text style={styles.label}>Email</Text><TextInput style={styles.input} value={identifier} onChangeText={setIdentifier} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.muted} /><Text style={styles.label}>Password</Text><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry placeholderTextColor={colors.muted} /></>}
      <Pressable disabled={busy} onPress={method === 'password' && mode === 'login' ? passwordSignIn : otpId ? verify : requestCode} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, busy && styles.disabled]}>{busy ? <ActivityIndicator color={colors.surface} /> : <><Text style={styles.ctaText}>{method === 'password' && mode === 'login' ? 'Sign in securely' : otpId ? (mode === 'register' ? 'Verify & create account' : 'Verify & sign in') : 'Send WhatsApp OTP'}</Text><Ionicons name="arrow-forward" size={18} color={colors.surface} /></>}</Pressable>
      {otpId && <Pressable onPress={reset} style={styles.secondary}><Text style={styles.secondaryText}>Change number</Text></Pressable>}
    </View>
    <Text style={styles.footer}>Your health data is protected with secure sign-in and encrypted storage.</Text>
  </ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, scroll: { padding: spacing.lg, paddingTop: 56, paddingBottom: 40 }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, brand: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }, hero: { marginTop: 48, marginBottom: 28 }, eyebrow: { color: colors.greenDeep, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 }, title: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 12 }, card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow }, segment: { flexDirection: 'row', backgroundColor: colors.canvas, borderRadius: radius.sm, padding: 4, marginBottom: 24 }, segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 8 }, segmentActive: { backgroundColor: colors.surface }, segmentText: { color: colors.muted, fontSize: 13, fontWeight: '700' }, segmentTextActive: { color: colors.ink }, sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 12 }, label: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 7 }, input: { height: 52, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 15, color: colors.ink, fontSize: 15, backgroundColor: '#FCFEFD' }, otpInput: { height: 64, borderWidth: 1, borderColor: colors.green, borderRadius: radius.sm, paddingHorizontal: 15, color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: 7, textAlign: 'center', backgroundColor: colors.greenSoft }, methodRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, marginBottom: 18 }, methodItem: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' }, methodActive: { borderBottomColor: colors.green }, methodText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, methodTextActive: { color: colors.ink }, roleRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, roleChip: { flex: 1, borderWidth: 1, borderColor: colors.line, padding: 11, borderRadius: radius.sm, alignItems: 'center' }, roleChipActive: { borderColor: colors.green, backgroundColor: colors.greenSoft }, roleText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, roleTextActive: { color: colors.greenDeep }, helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 }, error: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.redSoft, padding: 11, borderRadius: radius.sm, marginBottom: 10 }, errorText: { color: colors.red, flex: 1, fontSize: 12, lineHeight: 17 }, cta: { backgroundColor: colors.green, height: 54, borderRadius: radius.sm, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, ctaPressed: { backgroundColor: colors.greenDeep }, disabled: { opacity: 0.6 }, ctaText: { color: colors.surface, fontSize: 14, fontWeight: '800' }, secondary: { alignItems: 'center', padding: 14 }, secondaryText: { color: colors.greenDeep, fontSize: 13, fontWeight: '700' }, footer: { textAlign: 'center', color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 24, paddingHorizontal: 20 } });
