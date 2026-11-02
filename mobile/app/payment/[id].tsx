import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { api, ApiError, type Payment } from '@/api';
import { Card, EmptyState, ErrorState, StatusBadge } from '@/ui';
import { colors, radius, shadow, spacing } from '@/theme';

function formatMoney(amount: number, currency: string) { return `${currency === 'INR' ? '₹' : currency}${amount.toLocaleString('en-IN')}`; }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

export default function PaymentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getPayment(id).then(setPayment).catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load payment')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.root}><View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View></View>;
  if (error) return <View style={styles.root}><View style={styles.content}><ErrorState text={error} /></View></View>;
  if (!payment) return <View style={styles.root}><View style={styles.content}><EmptyState icon="receipt-outline" title="Payment not found" text="This transaction may have been removed." /></View></View>;

  const isPaid = payment.status === 'paid';
  const isFailed = payment.status === 'failed';
  const isPending = payment.status === 'created' || payment.status === 'pending';
  const isRefunded = payment.status === 'refunded' || payment.refund != null;

  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: true, headerBackTitle: 'Back', title: 'Payment Receipt', headerStyle: { backgroundColor: colors.canvas }, headerTintColor: colors.ink, headerShadowVisible: false }} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.statusHero, isPaid && styles.heroPaid, isFailed && styles.heroFailed, isPending && styles.heroPending, isRefunded && styles.heroRefunded]}>
        <View style={styles.statusIcon}><Ionicons name={isRefunded ? 'refresh-circle' : isPaid ? 'checkmark-circle' : isFailed ? 'close-circle' : 'hourglass'} size={40} color={colors.surface} /></View>
        <Text style={styles.statusHeroTitle}>{isRefunded ? 'Payment Refunded' : isPaid ? 'Payment Successful' : isFailed ? 'Payment Failed' : 'Payment Pending'}</Text>
        <Text style={styles.statusHeroAmount}>{formatMoney(payment.amount, payment.currency)}</Text>
        <Text style={styles.statusHeroDate}>{formatDate(payment.createdAt)}</Text>
      </View>

      <Card style={styles.detailCard}>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Transaction ID</Text><Text style={styles.detailValue}>{payment.paymentId.slice(0, 16)}</Text></View>
        {payment.razorpayOrderId ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Order ID</Text><Text style={styles.detailValue}>{payment.razorpayOrderId}</Text></View> : null}
        {payment.razorpayPaymentId ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Payment ID</Text><Text style={styles.detailValue}>{payment.razorpayPaymentId}</Text></View> : null}
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Service</Text><Text style={styles.detailValue}>{payment.service}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Amount</Text><Text style={styles.detailValue}>{formatMoney(payment.amount, payment.currency)}</Text></View>
        {payment.method ? <View style={styles.detailRow}><Text style={styles.detailLabel}>Method</Text><Text style={styles.detailValue}>{payment.method}</Text></View> : null}
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Status</Text><StatusBadge status={payment.status} /></View>
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{formatDate(payment.createdAt)}</Text></View>
      </Card>

      {payment.refund ? <View>
        <View style={styles.refundHeader}><Ionicons name="refresh-circle-outline" size={20} color={colors.blue} /><Text style={styles.refundHeaderTitle}>Refund details</Text></View>
        <Card style={styles.refundCard}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Refund amount</Text><Text style={styles.detailValue}>{formatMoney(payment.refund.amount, payment.currency)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Refund status</Text><StatusBadge status={payment.refund.status} /></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Initiated</Text><Text style={styles.detailValue}>{formatDate(payment.refund.initiatedAt)}</Text></View>
          {payment.refund.reason ? <View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Text style={styles.detailLabel}>Reason</Text><Text style={styles.detailValue}>{payment.refund.reason}</Text></View> : null}
        </Card>
        <View style={styles.refundNote}><Ionicons name="information-circle-outline" size={18} color={colors.blue} /><Text style={styles.refundNoteText}>Refunds typically take 5-7 business days to reflect in your account, depending on your bank and payment method.</Text></View>
      </View> : null}

      {payment.razorpaySignatureVerified ? <View style={styles.verifiedNote}><Ionicons name="shield-checkmark" size={18} color={colors.greenDeep} /><Text style={styles.verifiedText}>Signature verified by VetWise backend</Text></View> : null}

      {isPaid ? <Pressable style={styles.receiptBtn}><Ionicons name="download-outline" size={18} color={colors.greenDeep} /><Text style={styles.receiptBtnText}>Download receipt</Text></Pressable> : null}

      {isPending ? <View style={styles.pendingNote}><Ionicons name="information-circle-outline" size={18} color={colors.amber} /><Text style={styles.pendingText}>This payment is still being processed. You will be notified once it completes. If you completed payment, the backend webhook will verify and update this automatically.</Text></View> : null}

      {isFailed ? <View style={styles.failedNote}><Ionicons name="alert-circle-outline" size={18} color={colors.red} /><Text style={styles.failedText}>This payment could not be completed. No amount was deducted. You can try again from the subscription plans screen.</Text></View> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.canvas }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: spacing.lg, paddingTop: 8, paddingBottom: 36 }, loadingText: { color: colors.muted }, statusHero: { alignItems: 'center', paddingVertical: 36, borderRadius: radius.lg, ...shadow }, heroPaid: { backgroundColor: colors.green }, heroFailed: { backgroundColor: colors.red }, heroPending: { backgroundColor: colors.amber }, heroRefunded: { backgroundColor: colors.blue }, statusIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }, statusHeroTitle: { color: colors.surface, fontSize: 18, fontWeight: '800', marginTop: 14 }, statusHeroAmount: { color: colors.surface, fontSize: 34, fontWeight: '800', marginTop: 6 }, statusHeroDate: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }, detailCard: { marginTop: 20 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }, detailLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' }, detailValue: { color: colors.ink, fontSize: 13, fontWeight: '700', maxWidth: '55%', textAlign: 'right' }, refundHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 24, marginBottom: 12 }, refundHeaderTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, refundCard: { marginBottom: 10 }, refundNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.blueSoft, padding: 14, borderRadius: radius.sm, marginTop: 14 }, refundNoteText: { flex: 1, color: colors.blue, fontSize: 12, lineHeight: 17 }, verifiedNote: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.greenSoft, padding: 14, borderRadius: radius.sm, marginTop: 14 }, verifiedText: { color: colors.greenDeep, fontSize: 13, fontWeight: '700' }, receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, height: 50, borderRadius: radius.sm, marginTop: 16, ...shadow }, receiptBtnText: { color: colors.greenDeep, fontSize: 14, fontWeight: '800' }, pendingNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.amberSoft, padding: 14, borderRadius: radius.sm, marginTop: 14 }, pendingText: { flex: 1, color: colors.amber, fontSize: 12, lineHeight: 17 }, failedNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.redSoft, padding: 14, borderRadius: radius.sm, marginTop: 14 }, failedText: { flex: 1, color: colors.red, fontSize: 12, lineHeight: 17 } });
