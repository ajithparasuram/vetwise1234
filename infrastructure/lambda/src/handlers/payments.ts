/**
 * Payments Lambda Handler
 *
 * Endpoints:
 *   POST /payments/orders    — Create Razorpay order (server-computed amount)
 *   POST /payments/verify   — Verify Razorpay signature
 *   GET  /payments          — List payments (filtered by role)
 *   GET  /payments/{id}     — Get single payment
 *   POST /payments/webhook  — Razorpay webhook (public, HMAC verified)
 *
 * SECURITY:
 *   - Amount is NEVER trusted from the client. The backend looks up the price
 *     from VetWise-Plans or appointment fee. Any amount field in the request
 *     body is discarded.
 *   - Razorpay signature is verified server-side.
 *   - Webhook idempotency via razorpayPaymentId dedup.
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { success, badRequest, forbidden, notFound, internalError, parseBody, getPathParam } from '../shared/response';
import { requireAuth } from '../shared/auth';
import { scanTable, getItem, putItem, queryByIndex, uuid, now } from '../shared/db';
import { sanitizeString } from '../shared/validation';
import type { Payment, Plan } from '../shared/types';
import * as crypto from 'crypto';

const secretsClient = new SecretsManagerClient({});
const RAZORPAY_SECRET_NAME = `vetwise/razorpay/${process.env.STAGE ?? 'staging'}`;

async function getRazorpayCredentials(): Promise<{ keyId: string; keySecret: string; webhookSecret: string }> {
  const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: RAZORPAY_SECRET_NAME }));
  const parsed = JSON.parse(result.SecretString ?? '{}');
  return {
    keyId: parsed.RAZORPAY_KEY_ID,
    keySecret: parsed.RAZORPAY_KEY_SECRET,
    webhookSecret: parsed.RAZORPAY_WEBHOOK_SECRET,
  };
}

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  const resource = event.resource ?? '';
  try {
    // Webhook is public — verify HMAC signature
    if (resource === '/payments/webhook' && method === 'POST') {
      return await handleWebhook(event);
    }

    const ctx = requireAuth(event);

    if (resource === '/payments/orders' && method === 'POST') return await handleCreateOrder(event, ctx.sub);
    if (resource === '/payments/verify' && method === 'POST') return await handleVerify(event, ctx.sub);
    if (resource === '/payments/{id}/refund' && method === 'POST') return await handleRefund(event, ctx);
    if (resource === '/payments' && method === 'GET') return await handleList(event, ctx);
    if (resource === '/payments/{id}' && method === 'GET') return await handleGet(event, ctx);

    return badRequest('Unknown payments endpoint');
  } catch (err) {
    console.error('Payments handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    if ((err as { statusCode?: number })?.statusCode === 401) return forbidden('Authentication required');
    return internalError();
  }
};

/**
 * POST /payments/orders
 *
 * Body: { resourceType: 'plan' | 'appointment', resourceId }
 *
 * The server computes the amount by looking up the plan or appointment.
 * Any `amount` field in the body is IGNORED.
 */
async function handleCreateOrder(event: APIGatewayProxyEvent, userId: string) {
  const body = parseBody(event);
  const resourceType = sanitizeString(body.resourceType);
  const resourceId = sanitizeString(body.resourceId);

  if (!resourceType || !resourceId) return badRequest('resourceType and resourceId are required');

  let amount = 0;
  let currency = 'INR';
  let service = '';

  if (resourceType === 'plan') {
    const plan = await getItem<Plan>('plans', { planId: resourceId });
    if (!plan) return notFound('Plan not found');
    if (!plan.active) return badRequest('This plan is not currently available');
    amount = plan.price;
    currency = plan.currency || 'INR';
    service = `Subscription: ${plan.name}`;
  } else if (resourceType === 'appointment') {
    amount = 49900; // Default appointment fee in paise (₹499)
    currency = 'INR';
    service = 'Appointment fee';
  } else {
    return badRequest('Invalid resourceType. Must be plan or appointment.');
  }

  if (amount <= 0) return badRequest('Invalid amount computed');

  const creds = await getRazorpayCredentials();
  if (creds.keyId === 'PLACEHOLDER') return internalError('Razorpay credentials not configured. Set them in AWS Secrets Manager.');

  // Create Razorpay order
  const orderResp = await fetch(`https://api.razorpay.com/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64'),
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency,
      receipt: `vw_${Date.now()}`,
    }),
  });

  if (!orderResp.ok) {
    const errText = await orderResp.text();
    console.error('Razorpay order creation failed:', errText);
    return internalError('Failed to create payment order');
  }

  const order = await orderResp.json() as { id: string; amount: number; currency: string };

  // Store internal payment record
  const payment: Payment = {
    paymentId: uuid(),
    ownerId: userId,
    service,
    amount: order.amount / 100,
    currency: order.currency,
    method: '',
    status: 'created',
    razorpayOrderId: order.id,
    razorpaySignatureVerified: false,
    createdAt: now(),
    updatedAt: now(),
  };
  await putItem('payments', payment);

  return success({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: creds.keyId,
    paymentId: payment.paymentId,
  });
}

/**
 * POST /payments/verify
 *
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId }
 *
 * Verifies the HMAC signature server-side. Never trusts frontend "success".
 */
async function handleVerify(event: APIGatewayProxyEvent, userId: string) {
  const body = parseBody(event);
  const razorpayOrderId = sanitizeString(body.razorpayOrderId);
  const razorpayPaymentId = sanitizeString(body.razorpayPaymentId);
  const razorpaySignature = sanitizeString(body.razorpaySignature);
  const paymentId = sanitizeString(body.paymentId);

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentId) {
    return badRequest('Missing required payment verification fields');
  }

  const creds = await getRazorpayCredentials();

  // Verify signature: HMAC-SHA256(razorpayOrderId|razorpayPaymentId, keySecret)
  const expectedSignature = crypto
    .createHmac('sha256', creds.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    return badRequest('Payment signature verification failed');
  }

  // Update payment record
  const existing = await getItem<Payment>('payments', { paymentId });
  if (!existing) return notFound('Payment record not found');
  if (existing.ownerId !== userId) return forbidden('Payment does not belong to you');

  await putItem('payments', {
    ...existing,
    status: 'paid',
    razorpayPaymentId,
    razorpaySignatureVerified: true,
    method: sanitizeString(body.method) || 'razorpay',
    updatedAt: now(),
  });

  return success({ verified: true, paymentId });
}

/**
 * GET /payments — list payments filtered by role
 */
async function handleRefund(event: APIGatewayProxyEvent, ctx: { role: string; sub: string }) {
  const paymentId = getPathParam(event, 'id');
  if (!paymentId) return badRequest('Payment ID is required');

  const payment = await getItem<Payment>('payments', { paymentId });
  if (!payment) return notFound('Payment not found');
  if (ctx.role === 'client' && payment.ownerId !== ctx.sub) return forbidden('Payment does not belong to you');
  if (!['client', 'admin', 'frontdesk'].includes(ctx.role)) return forbidden();
  if (payment.status !== 'paid') return badRequest('Only completed payments can be refunded');
  if (payment.refund) return badRequest('This payment has already been refunded');
  if (!payment.razorpayPaymentId) return badRequest('This payment cannot be refunded online');

  const body = parseBody(event);
  const reason = sanitizeString(body.reason) || 'Requested by account holder';
  const creds = await getRazorpayCredentials();
  const refundResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.razorpayPaymentId)}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64'),
    },
    body: JSON.stringify({ amount: Math.round(payment.amount * 100), notes: { reason } }),
  });

  if (!refundResponse.ok) {
    console.error('Razorpay refund failed:', await refundResponse.text());
    return internalError('Refund could not be started');
  }

  const refund = await refundResponse.json() as { id: string; amount: number; status: string; created_at?: number };
  const updatedPayment: Payment = {
    ...payment,
    status: refund.status === 'processed' ? 'refunded' : 'refund_pending',
    refund: {
      amount: refund.amount / 100,
      status: refund.status,
      initiatedAt: refund.created_at ? new Date(refund.created_at * 1000).toISOString() : now(),
      reason,
    },
    updatedAt: now(),
  };
  await putItem('payments', updatedPayment);
  return success(updatedPayment);
}

async function handleList(event: APIGatewayProxyEvent, ctx: { role: string; sub: string }) {
  if (ctx.role === 'client') {
    const payments = await queryByIndex<Payment>('payments', 'ownerIdIndex', 'ownerId = :oid', { ':oid': ctx.sub });
    return success(payments);
  }
  if (['admin', 'frontdesk'].includes(ctx.role)) {
    const payments = await scanTable<Payment>('payments');
    return success(payments);
  }
  return forbidden();
}

/**
 * GET /payments/{id}
 */
async function handleGet(event: APIGatewayProxyEvent, ctx: { role: string; sub: string }) {
  const id = getPathParam(event, 'id');
  if (!id) return badRequest('Payment ID is required');
  const payment = await getItem<Payment>('payments', { paymentId: id });
  if (!payment) return notFound('Payment not found');
  if (ctx.role === 'client' && payment.ownerId !== ctx.sub) return forbidden('Payment does not belong to you');
  if (ctx.role === 'frontdesk') {
    // Front desk sees limited info — no sensitive payment details
    return success({
      paymentId: payment.paymentId,
      ownerId: payment.ownerId,
      service: payment.service,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt,
    });
  }
  return success(payment);
}

/**
 * POST /payments/webhook — Razorpay webhook (public, HMAC verified)
 *
 * Idempotent: duplicate deliveries do not create duplicate records.
 */
async function handleWebhook(event: APIGatewayProxyEvent) {
  const body = parseBody(event);
  const webhookSignature = event.headers['x-razorpay-signature'] ?? '';
  const creds = await getRazorpayCredentials();

  if (creds.webhookSecret === 'PLACEHOLDER') {
    return internalError('Webhook secret not configured');
  }

  // Verify webhook signature
  const bodyStr = event.body ?? '';
  const expectedSig = crypto
    .createHmac('sha256', creds.webhookSecret)
    .update(bodyStr)
    .digest('hex');

  if (expectedSig !== webhookSignature) {
    console.error('Webhook signature verification failed');
    return badRequest('Webhook signature verification failed');
  }

  const event_type = body.event ?? 'unknown';
  const paymentEntity = body.payload?.payment?.entity;
  const razorpayPaymentId = paymentEntity?.id;

  if (!razorpayPaymentId) return success({ received: true });

  // Idempotency: check if we already processed this payment
  const existingPayments = await scanTable<Payment>('payments');
  const existing = existingPayments.find((p) => p.razorpayPaymentId === razorpayPaymentId);
  if (existing && existing.status === 'paid') {
    return success({ received: true, duplicate: true });
  }

  // Update or create payment record based on webhook event
  if (event_type === 'payment.captured' || event_type === 'payment.authorized') {
    if (existing) {
      await putItem('payments', {
        ...existing,
        status: 'paid',
        razorpayPaymentId,
        razorpaySignatureVerified: true,
        updatedAt: now(),
      });
    }
  }

  return success({ received: true });
}
