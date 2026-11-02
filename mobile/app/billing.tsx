import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/auth';
import { api, ApiError, type Payment, type Plan, type SettingsResponse, type Subscription } from '@/api';
import { Card, EmptyState, ErrorState, SectionTitle, StatusBadge } from '@/ui';
import { colors, radius, shadow, spacing } from '@/theme';

function formatMoney(amount: number, currency: string) { return `${currency === 'INR' ? '₹' : currency}${amount.toLocaleString('en-IN')}`; }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

export default function Billing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, subs, pays] = await Promise.all([api.getSettings(), api.getSubscriptions(), api.getPayments()]);
      setSettings(s); setSubscriptions(subs); setPayments(pays);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not load billing'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const activeSub = subscriptions.find((s) => s.status === 'active') ?? subscriptions[subscriptions.length - 1];
  const activePlan = activeSub ? settings?.plans.find((p) => p.planId === activeSub.planId) : null;
  const paidPayments = payments.filter((p) => p.status === 'paid').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingPayments = payments.filter((p) => p.status === 'created' || p.status === 'pending');

  return <ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} colors={[colors.green]} />}>
    <Text style={styles.kicker}>BILLING & PAYMENTS</Text>
    <Text style={styles.title}>Your subscription and payments</Text>

    {loading ? <Text style={styles.loadingText}>Loading...</Text> : null}
    {error ? <ErrorState text={error} onRetry={fetch} /> : null}

    {!loading && !error ? <>
      <SectionTitle>Current subscription</SectionTitle>
      {activeSub ? <Card style={styles.subCard}>
        <View style={styles.subHeader}><View style={styles.subIcon}><Ionicons name="star" size={20} color={colors.surface} /></View><View style={{ flex: 1 }}><Text style={styles.subPlanName}>{activePlan?.name ?? 'VetWise Plan'}</Text><Text style={styles.subPrice}>{formatMoney(activeSub.price, activeSub.currency)} / {activePlan?.billingInterval ?? 'month'}</Text></View><StatusBadge status={activeSub.status} /></View>
        <View style={styles.subInfoRow}><Text style={styles.subInfoLabel}>Started</Text><Text style={styles.subInfoValue}>{formatDate(activeSub.startDate)}</Text></View>
        <View style={styles.subInfoRow}><Text style={styles.subInfoLabel}>Renews</Text><Text style={styles.subInfoValue}>{formatDate(activeSub.endDate)}</Text></View>
        {activeSub.benefits.length > 0 ? <View style={styles.benefits}><Text style={styles.benefitsLabel}>Included:</Text>{activeSub.benefits.map((b) => <View key={b} style={styles.benefitRow}><Ionicons name="checkmark-circle" size={15} color={colors.greenDeep} /><Text style={styles.benefitText}>{b}</Text></View>)}</View> : null}
        <Pressable onPress={() => router.push('/plans')} style={styles.manageBtn}><Text style={styles.manageBtnText}>Change plan</Text><Ionicons name="chevron-forward" size={16} color={colors.greenDeep} /></Pressable>
      </Card> : <EmptyState icon="star-outline" title="No active subscription" text="Choose a plan to unlock VetWise premium features." actionLabel="View plans" onAction={() => router.push('/plans')} />}

      {pendingPayments.length > 0 ? <View>
        <SectionTitle>Pending payments</SectionTitle>
        {pendingPayments.map((p) => <Pressable key={p.paymentId} onPress={() => router.push({ pathname: '/payment/[id]', params: { id: p.paymentId } })} style={styles.paymentRow}><View style={[styles.paymentIcon, { backgroundColor: colors.amberSoft }]}><Ionicons name="hourglass-outline" size={18} color={colors.amber} /></View><View style={{ flex: 1 }}><Text style={styles.paymentService}>{p.service}</Text><Text style={styles.paymentDate}>{formatDate(p.createdAt)}</Text></View><Text style={styles.paymentAmount}>{formatMoney(p.amount, p.currency)}</Text><StatusBadge status={p.status} /></Pressable>)}
      </View> : null}

      <SectionTitle>Payment history</SectionTitle>
      {paidPayments.length === 0 ? <EmptyState icon="receipt-outline" title="No payments yet" text="Your completed transactions will appear here with downloadable receipts." /> : paidPayments.map((p) => <Pressable key={p.paymentId} onPress={() => router.push({ pathname: '/payment/[id]', params: { id: p.paymentId } })} style={styles.paymentRow}><View style={styles.paymentIcon}><Ionicons name="checkmark-done" size={18} color={colors.greenDeep} /></View><View style={{ flex: 1 }}><Text style={styles.paymentService}>{p.service}</Text><Text style={styles.paymentDate}>{formatDate(p.createdAt)}{p.method ? ` · ${p.method}` : ''}</Text></View><Text style={styles.paymentAmount}>{formatMoney(p.amount, p.currency)}</Text><StatusBadge status={p.status} /></Pressable>)}
    </> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingTop: 58, paddingBottom: 36 }, kicker: { color: colors.greenDeep, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, title: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 6 }, loadingText: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 20 }, subCard: { marginBottom: 12 }, subHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }, subIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }, subPlanName: { color: colors.ink, fontSize: 17, fontWeight: '800' }, subPrice: { color: colors.muted, fontSize: 13, marginTop: 3 }, subInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }, subInfoLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' }, subInfoValue: { color: colors.ink, fontSize: 13, fontWeight: '700' }, benefits: { marginTop: 14 }, benefitsLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 8 }, benefitRow: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 6 }, benefitText: { color: colors.ink, fontSize: 13 }, manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }, manageBtnText: { color: colors.greenDeep, fontSize: 14, fontWeight: '800' }, paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: 10, ...shadow }, paymentIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, paymentService: { color: colors.ink, fontSize: 14, fontWeight: '800' }, paymentDate: { color: colors.muted, fontSize: 12, marginTop: 3 }, paymentAmount: { color: colors.ink, fontSize: 14, fontWeight: '800' } });
