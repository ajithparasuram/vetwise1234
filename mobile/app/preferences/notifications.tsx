import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { allCategories, getNotificationPrefs, setNotificationPref, type NotificationCategory } from '@/notification-prefs';
import { colors, radius, shadow, spacing } from '@/theme';

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Record<NotificationCategory, boolean>>({ appointments: true, medical: true, payments: true, subscriptions: true, general: true });
  const [permission, setPermission] = useState<Notifications.PermissionStatus>(Notifications.PermissionStatus.UNDETERMINED);

  useEffect(() => {
    getNotificationPrefs().then(setPrefs);
    Notifications.getPermissionsAsync().then(({ status }) => setPermission(status));
  }, []);

  const enableNotifications = async () => {
    const result = await Notifications.requestPermissionsAsync();
    setPermission(result.status);
  };

  const toggle = (category: NotificationCategory, value: boolean) => { setPrefs((p) => ({ ...p, [category]: value })); setNotificationPref(category, value); };

  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <Stack.Screen options={{ headerShown: true, title: 'Notification settings', headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.ink, headerShadowVisible: false }} />
    <Text style={styles.kicker}>NOTIFICATIONS</Text>
    <Text style={styles.title}>Manage your alerts</Text>
    <Text style={styles.subtitle}>Choose which notifications you receive. Critical security notifications always stay on.</Text>

    <View style={styles.permissionCard}>
      <View style={[styles.prefIcon, { backgroundColor: permission === 'granted' ? colors.greenSoft : colors.amberSoft }]}><Ionicons name={permission === 'granted' ? 'notifications-outline' : 'notifications-off-outline'} size={20} color={permission === 'granted' ? colors.greenDeep : colors.amber} /></View>
      <View style={{ flex: 1 }}><Text style={styles.prefTitle}>{permission === 'granted' ? 'Push notifications enabled' : 'Push notifications are off'}</Text><Text style={styles.prefText}>{permission === 'granted' ? 'VetWise can alert you about important activity.' : 'Enable device notifications to receive alerts outside the app.'}</Text></View>
      {permission !== 'granted' ? <Pressable onPress={enableNotifications} style={styles.enableBtn}><Text style={styles.enableBtnText}>Enable</Text></Pressable> : null}
    </View>

    {allCategories.map((cat) => <View key={cat.id} style={styles.prefCard}>
      <View style={[styles.prefIcon, { backgroundColor: colors.greenSoft }]}><Ionicons name={cat.id === 'appointments' ? 'calendar-outline' : cat.id === 'medical' ? 'medkit-outline' : cat.id === 'payments' ? 'card-outline' : cat.id === 'subscriptions' ? 'refresh-outline' : 'megaphone-outline'} size={20} color={colors.greenDeep} /></View>
      <View style={{ flex: 1 }}><Text style={styles.prefTitle}>{cat.label}</Text><Text style={styles.prefText}>{cat.description}</Text></View>
      <Switch value={prefs[cat.id]} onValueChange={(v) => toggle(cat.id, v)} trackColor={{ false: colors.line, true: colors.green }} thumbColor={colors.surface} />
    </View>)}

    <View style={styles.securityNote}><Ionicons name="shield-checkmark-outline" size={20} color={colors.greenDeep} /><Text style={styles.securityText}>Security and account notifications are always enabled to protect your account.</Text></View>
  </ScrollView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 36 }, kicker: { color: colors.greenDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 6 }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 22 }, permissionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 18, ...shadow }, prefCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 10, ...shadow }, enableBtn: { backgroundColor: colors.green, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 }, enableBtnText: { color: colors.surface, fontSize: 12, fontWeight: '800' }, prefIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, prefTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, prefText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4, paddingRight: 8 }, securityNote: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: spacing.md, marginTop: 8 }, securityText: { flex: 1, color: colors.greenDeep, fontSize: 12, lineHeight: 17, fontWeight: '600' } });
