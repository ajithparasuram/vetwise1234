/**
 * Razorpay native checkout integration.
 *
 * Uses react-native-razorpay which wraps the Razorpay Android SDK.
 * Install it with: npm install react-native-razorpay
 *
 * The keyId comes from the backend (never hardcoded in the app). The
 * backend creates the order and returns orderId + keyId. After the
 * user completes payment, the result is sent to the backend for
 * server-side signature verification.
 */

import { Platform, Alert } from 'react-native';

export type RazorpayResult = {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  method?: string;
};

export type RazorpayOptions = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
};

type RazorpayError = { code: number; description: string; source: string; step: string; reason: string };
type RazorpayCallbackResult = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  error?: RazorpayError;
};
type RazorpayModuleType = {
  open: (options: Record<string, unknown>, callback: (result: RazorpayCallbackResult) => void) => void;
};

function loadRazorpayModule(): RazorpayModuleType | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-razorpay');
    return (mod.default ?? mod) as RazorpayModuleType;
  } catch {
    return null;
  }
}

export function openRazorpayCheckout(options: RazorpayOptions): Promise<RazorpayResult> {
  const mod = loadRazorpayModule();

  if (!mod) {
    return new Promise((_resolve, reject) => {
      Alert.alert(
        'Razorpay SDK Required',
        'The Razorpay React Native SDK is not installed.\n\nInstall it with: npm install react-native-razorpay\n\nThen rebuild the Android app. The backend order has already been created — once the SDK is added, checkout will open automatically.',
        [{ text: 'OK', onPress: () => reject(new Error('Razorpay SDK not installed')) }]
      );
    });
  }

  return new Promise<RazorpayResult>((resolve, reject) => {
    mod.open(
      {
        key: options.keyId,
        amount: String(options.amount),
        currency: options.currency,
        name: options.name,
        description: options.description,
        order_id: options.orderId,
        prefill: options.prefill,
        theme: options.theme,
      },
      (result) => {
        if (result.error) {
          reject(new Error(result.error.description || 'Payment failed'));
        } else if (result.razorpay_payment_id && result.razorpay_order_id && result.razorpay_signature) {
          resolve({
            razorpayPaymentId: result.razorpay_payment_id,
            razorpayOrderId: result.razorpay_order_id,
            razorpaySignature: result.razorpay_signature,
          });
        } else {
          reject(new Error('Incomplete payment response'));
        }
      }
    );
  });
}
