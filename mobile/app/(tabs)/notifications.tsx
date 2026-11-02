import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/auth';
import { api, ApiError, type NotificationItem } from '@/api';
import { Card, EmptyState, ErrorState } from '@/ui';
import { colors, radius, shadow, spacing } from '@/theme';
import { getNotificationPrefs } from '@/notification-prefs';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function iconForEvent(eventType?: string): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  if (!eventType) return { icon: 'notifications-outline', color: colors.muted, bg: colors.canvas };
  if (eventType.includes('appointment')) return { icon: 'calendar-outline', color: colors.greenDeep, bg: colors.greenSoft };
  if (eventType.includes('prescription') || eventType.includes('vaccination')) return { icon: 'medkit-outline', color: colors.blue, bg: colors.blueSoft };
  if (eventType.includes('payment') || eventType.includes('invoice')) return { icon: 'card-outline', color: colors.amber, bg: colors.amberSoft };
  if (eventType.includes('subscription')) return { icon: 'refresh-circle-outline', color: colors.greenDeep, bg: colors.greenSoft };
  if (eventType.includes('video') || eventType.includes('consultation')) return { icon: 'videocam-outline', color: colors.blue, bg: colors.blueSoft };
  return { icon: 'notifications-outline', color: colors.muted, bg: colors.canvas };
}

function handleNotificationTap(item: NotificationItem) {
  const eventType = item.eventType ?? '';
  const resourceId = item.resourceId;
  if (eventType.includes('appointment') && resourceId) { router.push({ pathname: '/(tabs)/third' }); return; }
  if (eventType.includes('prescription') && resourceId) { router.push({ pathname: '/pet/[id]', params: { id: resourceId } }); return; }
  if (eventType.includes('pet') && resourceId) { router.push({ pathname: '/pet/[id]', params: { id: resourceId } }); return; }
  if (eventType.includes('payment') && resourceId) { router.push({ pathname: '/payment/[id]', params: { id: resourceId } }); return; }
  if (eventType.includes('video') || eventType.includes('consultation')) { if (resourceId) router.push({ pathname: '/consultation/[id]', params: { id: resourceId } }); return; }
}

export default function Notifications() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api.getNotifications();
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(sorted);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not load notifications'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const unreadCount = items.filter((i) => !readIds.has(i.notificationId)).length;

  const markAllRead = () => setReadIds(new Set(items.map((i) => i.notificationId)));
  const markRead = (id: string) => setReadIds((prev) => new Set([...prev, id]));

  return <View style={styles.root}>
    <View style={styles.header}>
      <View>
        <Text style={styles.kicker}>NOTIFICATIONS</Text>
        <Text style={styles.title}>Stay in the loop</Text>
      </View>
      {unreadCount > 0 ? <Pressable onPress={markAllRead} style={styles.markAllBtn}><Text style={styles.markAllText}>Mark all read</Text></Pressable> : null}
    </View>

    {unreadCount > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unreadCount} unread</Text></View> : null}

    {error ? <ErrorState text={error} onRetry={fetch} /> : null}

    <FlatList
      data={items}
      keyExtractor={(item) => item.notificationId}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} colors={[colors.green]} />}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 36 }}
      renderItem={({ item }) => {
        const meta = iconForEvent(item.eventType);
        const isUnread = !readIds.has(item.notificationId);
        return <Pressable onPress={() => { markRead(item.notificationId); handleNotificationTap(item); }} style={[styles.notifCard, isUnread && styles.unreadCard]}>
          {isUnread ? <View style={styles.unreadDot} /> : null}
          <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}><Ionicons name={meta.icon} size={20} color={meta.color} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifEvent}>{item.eventType ? item.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Notification'}</Text>
            <Text style={styles.notifTime}>{relativeTime(item.createdAt)}</Text>
            {item.channel ? <Text style={styles.notifChannel}>{item.channel}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Pressable>;
      }}
      ListEmptyComponent={!loading ? <EmptyState icon="notifications-outline" title="You are all caught up" text="Appointment reminders, prescription updates, and payment confirmations will appear here." /> : null}
    />
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: 58, paddingBottom: 14 }, kicker: { color: colors.greenDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 6 }, markAllBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.greenSoft, borderRadius: 999 }, markAllText: { color: colors.greenDeep, fontSize: 12, fontWeight: '800' }, unreadBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: 8 }, unreadText: { color: colors.greenDeep, fontSize: 12, fontWeight: '800', backgroundColor: colors.greenSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }, notifCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 10, ...shadow, position: 'relative' }, unreadCard: { borderLeftWidth: 3, borderLeftColor: colors.green }, unreadDot: { position: 'absolute', top: 18, right: 42, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }, notifIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, notifEvent: { color: colors.ink, fontSize: 14, fontWeight: '800' }, notifTime: { color: colors.muted, fontSize: 12, marginTop: 3 }, notifChannel: { color: colors.greenDeep, fontSize: 11, fontWeight: '700', marginTop: 4 } });
