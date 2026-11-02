import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '@/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, shadow, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: string; action?: string }) {
  return <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{children}</Text>{action ? <Text style={styles.sectionAction}>{action}</Text> : null}</View>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === 'completed' ? colors.green : normalized === 'cancelled' || normalized === 'rejected' ? colors.red : normalized === 'pending' ? colors.amber : normalized === 'confirmed' || normalized === 'active' ? colors.blue : colors.muted;
  const bg = normalized === 'completed' ? colors.greenSoft : normalized === 'cancelled' || normalized === 'rejected' ? colors.redSoft : normalized === 'pending' ? colors.amberSoft : normalized === 'confirmed' || normalized === 'active' ? colors.blueSoft : colors.canvas;
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text style={[styles.badgeText, { color: tone }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text></View>;
}

export function EmptyState({ icon, title, text, actionLabel, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; actionLabel?: string; onAction?: () => void }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={30} color={colors.greenDeep} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text>{actionLabel && onAction ? <Pressable onPress={onAction} style={styles.emptyAction}><Text style={styles.emptyActionText}>{actionLabel}</Text></Pressable> : null}</View>;
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={20} color={colors.red} /><Text style={styles.errorText}>{text}</Text>{onRetry ? <Pressable onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable> : null}</View>;
}

export function Skeleton({ width, height, rounded }: { width: number | string; height: number; rounded?: number }) {
  return <View style={[styles.skeleton, { width: width as number, height, borderRadius: rounded ?? radius.sm }]} />;
}

export function LoadingBlock({ label }: { label?: string }) {
  return <View style={styles.loadingBlock}><ActivityIndicator color={colors.green} />{label ? <Text style={styles.loadingText}>{label}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sectionAction: { color: colors.greenDeep, fontSize: 13, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 28, marginTop: 18 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, paddingHorizontal: 10 },
  emptyAction: { marginTop: 16, backgroundColor: colors.green, paddingHorizontal: 20, paddingVertical: 11, borderRadius: radius.sm },
  emptyActionText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  errorBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.redSoft, padding: 14, borderRadius: radius.md, marginTop: 14 },
  errorText: { flex: 1, color: colors.red, fontSize: 13, lineHeight: 19 },
  retry: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: radius.sm },
  retryText: { color: colors.red, fontSize: 12, fontWeight: '800' },
  skeleton: { backgroundColor: '#E8EFEB' },
  loadingBlock: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  loadingText: { color: colors.muted, fontSize: 13 },
});
