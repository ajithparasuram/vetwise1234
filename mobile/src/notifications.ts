import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import { getSession } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getDevicePushTokenAsync();
  const token = String(tokenData.data);

  const session = await getSession();
  if (session?.accessToken) {
    try {
      await api.registerDevice(token, Platform.OS, '1.0.0');
    } catch {
      // Token registration failed — will retry on next app launch
    }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('appointments', { name: 'Appointments', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250], lightColor: '#0D9B6A' });
    await Notifications.setNotificationChannelAsync('medical', { name: 'Medical Reminders', importance: Notifications.AndroidImportance.HIGH, lightColor: '#2E5CB8' });
    await Notifications.setNotificationChannelAsync('payments', { name: 'Payments', importance: Notifications.AndroidImportance.DEFAULT, lightColor: '#B86B18' });
    await Notifications.setNotificationChannelAsync('general', { name: 'General', importance: Notifications.AndroidImportance.LOW, lightColor: '#6E7E7A' });
  }

  return token;
}

export function listenForNotificationTap(handler: (data: Record<string, unknown>) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    handler(data);
  });
  return () => subscription.remove();
}

export function listenForForegroundNotifications(handler: (notification: Notifications.Notification) => void): () => void {
  const subscription = Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}

export async function clearAllBadges(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}
