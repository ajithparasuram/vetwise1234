/**
 * Razorpay TEST MODE integration.
 *
 * Uses the test API key to create orders directly from the frontend
 * for testing payment flows without touching production infrastructure.
 * The test key (rzp_test_*) is safe to expose client-side — it can only
 * make test payments that never charge real money.
 *
 * In production, the existing AWS Lambda handler should be used instead.
 */

const RAZORPAY_TEST_KEY_ID = import.meta.env.VITE_RAZORPAY_TEST_KEY_ID ?? '';
const RAZORPAY_TEST_KEY_SECRET = import.meta.env.VITE_RAZORPAY_TEST_KEY_SECRET ?? '';

export function isRazorpayTestModeAvailable(): boolean {
  return RAZORPAY_TEST_KEY_ID.startsWith('rzp_test_') && !!RAZORPAY_TEST_KEY_SECRET;
}

export interface RazorpayTestOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Creates a Razorpay test order directly via the Razorpay API.
 * Uses HTTP Basic auth with the test key pair.
 * Amount is in paise (multiply rupees by 100).
 */
export async function createRazorpayTestOrder(amountInRupees: number, receipt?: string): Promise<{ data: RazorpayTestOrder | null; error: string | null }> {
  if (!isRazorpayTestModeAvailable()) {
    return { data: null, error: 'Razorpay test mode not configured. Set VITE_RAZORPAY_TEST_KEY_ID and VITE_RAZORPAY_TEST_KEY_SECRET.' };
  }
  try {
    const auth = btoa(`${RAZORPAY_TEST_KEY_ID}:${RAZORPAY_TEST_KEY_SECRET}`);
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amountInRupees * 100),
        currency: 'INR',
        receipt: receipt ?? `vw_test_${Date.now()}`,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { data: null, error: `Razorpay test order failed: ${errText.slice(0, 200)}` };
    }
    const order = await res.json() as RazorpayTestOrder;
    return { data: order, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to create test order' };
  }
}

/**
 * Opens the Razorpay checkout widget for a test order.
 * Loads the Razorpay checkout.js script dynamically.
 * In test mode, no real payment is processed.
 */
export function openRazorpayTestCheckout(
  order: RazorpayTestOrder,
  onSuccess: (paymentId: string, signature: string) => void,
  onFailure: (error: string) => void,
): void {
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onerror = () => onFailure('Failed to load Razorpay checkout');
  script.onload = () => {
    const rzp = new (window as any).Razorpay({
      key: RAZORPAY_TEST_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'VetWise',
      description: 'Test Payment',
      order_id: order.id,
      handler: (response: any) => {
        onSuccess(response.razorpay_payment_id, response.razorpay_signature ?? '');
      },
      modal: {
        ondismiss: () => onFailure('Payment cancelled by user'),
      },
      theme: { color: '#112b73' },
    });
    rzp.open();
  };
  document.head.appendChild(script);
}

/**
 * Verifies a Razorpay test payment signature client-side.
 * In production, this should be done server-side. For test mode,
 * we verify on the client using the test key secret.
 */
export async function verifyRazorpayTestPayment(
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<{ verified: boolean; error: string | null }> {
  if (!isRazorpayTestModeAvailable()) {
    return { verified: false, error: 'Test mode not configured' };
  }

  try {
    // Use SubtleCrypto for HMAC-SHA256 verification
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_TEST_KEY_SECRET);
    const message = encoder.encode(`${orderId}|${paymentId}`);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const expectedSig = await crypto.subtle.sign('HMAC', cryptoKey, message);
    const expectedHex = Array.from(new Uint8Array(expectedSig))
      .map((b) => b.toString(16).padStart(2, '0')).join('');

    if (expectedHex === signature) {
      return { verified: true, error: null };
    }
    return { verified: false, error: 'Signature verification failed' };
  } catch (e) {
    return { verified: false, error: e instanceof Error ? e.message : 'Verification error' };
  }
}
