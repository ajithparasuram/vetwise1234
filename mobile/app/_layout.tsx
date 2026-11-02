import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/auth';
import { colors } from '@/theme';

export default function RootLayout() {
  return <AuthProvider><StatusBar style="dark" backgroundColor={colors.canvas} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} /></AuthProvider>;
}
