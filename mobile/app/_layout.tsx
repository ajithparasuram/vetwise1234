import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/auth';
import { colors } from '@/theme';
import { registerForPushNotifications, listenForNotificationTap, clearAllBadges } from '@/notifications';
import { router } from 'expo-router';

function NotificationBootstrap() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) { clearAllBadges(); return; }
    registerForPushNotifications();
    const unsub = listenForNotificationTap((data) => {
      const eventType = String(data.eventType ?? '');
      const resourceId = String(data.resourceId ?? '');
      if (eventType.includes('appointment')) router.push('/(tabs)/third');
      else if (eventType.includes('pet') && resourceId) router.push({ pathname: '/pet/[id]', params: { id: resourceId } });
      else if (eventType.includes('payment') && resourceId) router.push({ pathname: '/payment/[id]', params: { id: resourceId } });
      else if (eventType.includes('consultation') && resourceId) router.push({ pathname: '/consultation/[id]', params: { id: resourceId } });
    });
    return unsub;
  }, [user]);
  return null;
}

export default function RootLayout() {
  return <AuthProvider>
    <NotificationBootstrap />
    <StatusBar style="dark" backgroundColor={colors.canvas} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
  </AuthProvider>;
}
