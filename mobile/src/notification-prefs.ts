import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationCategory = 'appointments' | 'medical' | 'payments' | 'subscriptions' | 'general';
export const allCategories: { id: NotificationCategory; label: string; description: string }[] = [
  { id: 'appointments', label: 'Appointments', description: 'Booking confirmations, reminders, and schedule changes' },
  { id: 'medical', label: 'Medical reminders', description: 'Vaccinations, prescriptions, and follow-up care' },
  { id: 'payments', label: 'Payments', description: 'Payment confirmations and transaction receipts' },
  { id: 'subscriptions', label: 'Subscription updates', description: 'Plan renewals, expirations, and changes' },
  { id: 'general', label: 'Announcements', description: 'Product updates and general notifications' },
];

const prefKey = 'vetwise.mobile.notification_prefs';

export async function getNotificationPrefs(): Promise<Record<NotificationCategory, boolean>> {
  const value = await AsyncStorage.getItem(prefKey);
  if (value) return JSON.parse(value) as Record<NotificationCategory, boolean>;
  return { appointments: true, medical: true, payments: true, subscriptions: true, general: true };
}

export async function setNotificationPref(category: NotificationCategory, enabled: boolean): Promise<void> {
  const current = await getNotificationPrefs();
  const next = { ...current, [category]: enabled };
  await AsyncStorage.setItem(prefKey, JSON.stringify(next));
}

export function channelForEventType(eventType?: string): NotificationCategory {
  if (!eventType) return 'general';
  if (eventType.includes('appointment') || eventType.includes('schedule')) return 'appointments';
  if (eventType.includes('prescription') || eventType.includes('vaccination') || eventType.includes('medical')) return 'medical';
  if (eventType.includes('payment') || eventType.includes('invoice')) return 'payments';
  if (eventType.includes('subscription') || eventType.includes('plan')) return 'subscriptions';
  return 'general';
}

export function shouldShowNotification(eventType: string, prefs: Record<NotificationCategory, boolean>): boolean {
  return prefs[channelForEventType(eventType)] ?? true;
}
