import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { api, ApiError, type Plan, type SettingsResponse, type Subscription, type CreateOrderResponse } from '@/api';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/ui';
import { colors, radius, shadow, spacing } from '@/theme';

function formatMoney(amount: number, currency: string) { return `${currency === 'INR' ? '₹' : currency}${amount.toLocaleString('en-IN')}`; }

export default function Plans() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'creating-order' | 'waiting-payment' | 'verifying' | 'success' | 'failed' | 'no-credentials'>('idle');
  const [checkoutError, setCheckoutError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, subs] = await Promise.all([api.getSettings(), api.getSubscriptions()]);
      setSettings(s); setSubscriptions(subs);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not load plans'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const activeSub = subscriptions.find((s) => s.status === 'active');
  const activePlanId = activeSub?.planId;

  const startCheckout = async (plan: Plan) => {
    setCheckoutPlan(plan); setCheckoutState('creating-order'); setCheckoutError('');
    try {
      const order: CreateOrderResponse = await api.createOrder('plan', plan.planId);
      setCheckoutState('waiting-payment');
      Alert.alert('Razorpay Checkout', `Order created for ${formatMoney(order.amount / 100, order.currency)}. The native Razorpay checkout SDK will open here.\n\nKey ID: ${order.keyId}\nOrder ID: ${order.orderId}\n\nTo complete payment, add the Razorpay React Native SDK dependency and configure your Razorpay test keys in AWS Secrets Manager. The backend signature verification is already implemented.`, [{ text: 'OK', onPress: () => setCheckoutState('idle') }]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not start checkout';
      setCheckoutError(message); setCheckoutState('failed');
    }
  };

  const cancelSub = async (id: string) => {
    Alert.alert('Cancel subscription', 'Are you sure you want to cancel your subscription? You will lose access at the end of the current billing period.', [{ text: 'No' }, { text: 'Cancel plan', style: 'destructive', onPress: async () => { try { await api.cancelSubscription(id); fetch(); } catch (err) { Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel'); } } }]);
  };

  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: true, headerBackTitle: 'Back', title: 'Subscription Plans', headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.ink, headerShadowVisible: false }} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} colors={[colors.green]} />}>
      {loading ? <LoadingBlock label="Loading plans..." /> : error ? <ErrorState text={error} onRetry={fetch} /> : settings && settings.plans.length > 0 ? <>
        <Text style={styles.subtitle}>Choose the plan that fits your pet care needs. Prices are set by your VetWise practice.</Text>
        {settings.plans.map((plan) => {
          const isActive = plan.planId === activePlanId;
          return <Card key={plan.planId} style={[styles.planCard, isActive ? styles.planCardActive : undefined]}>
            {isActive ? <View style={styles.activeBadge}><Ionicons name="checkmark-circle" size={13} color={colors.surface} /><Text style={styles.activeBadgeText}>Current plan</Text></View> : null}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}><Text style={styles.priceAmount}>{formatMoney(plan.price, plan.currency)}</Text><Text style={styles.priceInterval}> / {plan.billingInterval}</Text></View>
            {plan.duration ? <Text style={styles.duration}>{plan.duration}</Text> : null}
            {plan.benefits.length > 0 ? <View style={styles.benefits}>{plan.benefits.map((b) => <View key={b} style={styles.benefitRow}><Ionicons name="checkmark-circle" size={16} color={colors.greenDeep} /><Text style={styles.benefitText}>{b}</Text></View>)}</View> : null}
            {plan.taxTreatment ? <Text style={styles.taxText}>{plan.taxTreatment}</Text> : null}
            {isActive && activeSub ? <Pressable onPress={() => cancelSub(activeSub.subscriptionId)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel subscription</Text></Pressable> : <Pressable disabled={checkoutState !== 'idle' && checkoutState !== 'failed'} onPress={() => startCheckout(plan)} style={[styles.subscribeBtn, (checkoutState !== 'idle' && checkoutState !== 'failed') && { opacity: 0.6 }]}><Ionicons name="card-outline" size={17} color={colors.surface} /><Text style={styles.subscribeBtnText}>Subscribe with Razorpay</Text></Pressable>}
          </Card>;
        })}

        <View style={styles.securityNote}><Ionicons name="lock-closed-outline" size={19} color={colors.greenDeep} /><View style={{ flex: 1 }}><Text style={styles.securityTitle}>Secured by Razorpay</Text><Text style={styles.securityText}>Payments are processed through Razorpay's secure checkout. Your card details never touch VetWise servers. Every payment is verified server-side before your subscription is activated.</Text></View></View>
      </> : <EmptyState icon="pricetag-outline" title="No plans available" text="Your practice has not configured any subscription plans yet. Check back later." />}
    </ScrollView>

    {checkoutState === 'creating-order' ? <View style={styles.overlay}><View style={styles.overlayCard}><LoadingBlock label="Creating secure payment order..." /></View></View> : null}
    {checkoutState === 'failed' ? <View style={styles.overlay}><View style={styles.overlayCard}><Ionicons name="alert-circle" size={36} color={colors.red} /><Text style={styles.overlayError}>{checkoutError}</Text><Pressable onPress={() => setCheckoutState('idle')} style={styles.overlayClose}><Text style={styles.overlayCloseText}>Close</Text></Pressable></View></View> : null}
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, content: { padding: spacing.lg, paddingTop: 8, paddingBottom: 36 }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 22 }, planCard: { marginBottom: 14, position: 'relative', overflow: 'hidden' }, planCardActive: { borderWidth: 2, borderColor: colors.green }, activeBadge: { position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.green, paddingHorizontal: 10, paddingVertical: 6, borderBottomLeftRadius: 12 }, activeBadgeText: { color: colors.surface, fontSize: 10, fontWeight: '800' }, planName: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 }, priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }, priceAmount: { color: colors.ink, fontSize: 32, fontWeight: '800' }, priceInterval: { color: colors.muted, fontSize: 15, fontWeight: '600' }, duration: { color: colors.muted, fontSize: 12, marginTop: 4 }, benefits: { marginTop: 16 }, benefitRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }, benefitText: { color: colors.ink, fontSize: 13, flex: 1 }, taxText: { color: colors.muted, fontSize: 11, marginTop: 10 }, cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line }, cancelBtnText: { color: colors.red, fontSize: 14, fontWeight: '800' }, subscribeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.green, height: 50, borderRadius: radius.sm, marginTop: 14 }, subscribeBtnText: { color: colors.surface, fontSize: 14, fontWeight: '800' }, securityNote: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.greenSoft, borderRadius: radius.md, padding: spacing.md, marginTop: 12 }, securityTitle: { color: colors.greenDeep, fontSize: 14, fontWeight: '800' }, securityText: { color: colors.greenDeep, fontSize: 12, lineHeight: 17, marginTop: 4 }, overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(16,42,42,0.5)', alignItems: 'center', justifyContent: 'center' }, overlayCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 28, width: '80%', alignItems: 'center' }, overlayError: { color: colors.red, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 12 }, overlayClose: { marginTop: 16, backgroundColor: colors.canvas, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.sm }, overlayCloseText: { color: colors.ink, fontSize: 14, fontWeight: '800' } });
