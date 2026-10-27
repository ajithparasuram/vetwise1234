/**
 * Subscriptions Lambda Handler
 *
 * Endpoints:
 *   GET    /subscriptions              — List subscriptions (filtered by role)
 *   POST   /subscriptions              — Create subscription
 *   GET    /subscriptions/{id}        — Get single subscription
 *   POST   /subscriptions/{id}/cancel — Cancel subscription
 *
 * Plans are backend-driven from VetWise-Plans. Prices are never hardcoded
 * in the frontend.
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, forbidden, notFound, internalError, parseBody, getPathParam } from '../shared/response';
import { requireAuth } from '../shared/auth';
import { scanTable, getItem, putItem, queryByIndex, updateItem, uuid, now } from '../shared/db';
import { sanitizeString } from '../shared/validation';
import type { Subscription, Plan } from '../shared/types';

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  const resource = event.resource ?? '';
  try {
    const ctx = requireAuth(event);

    if (resource === '/subscriptions' && method === 'GET') {
      if (ctx.role === 'client') {
        const subs = await queryByIndex<Subscription>('subscriptions', 'ownerIdIndex', 'ownerId = :oid', { ':oid': ctx.sub });
        return success(subs);
      }
      if (['admin', 'frontdesk'].includes(ctx.role)) {
        const subs = await scanTable<Subscription>('subscriptions');
        return success(subs);
      }
      return forbidden();
    }

    if (resource === '/subscriptions' && method === 'POST') {
      const body = parseBody(event);
      const planId = sanitizeString(body.planId);
      if (!planId) return badRequest('planId is required');

      const plan = await getItem<Plan>('plans', { planId });
      if (!plan) return notFound('Plan not found');
      if (!plan.active) return badRequest('This plan is not currently available');

      const startDate = now();
      const endDate = plan.billingInterval === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      const sub: Subscription = {
        subscriptionId: uuid(),
        ownerId: ctx.role === 'client' ? ctx.sub : sanitizeString(body.ownerId) || ctx.sub,
        planId,
        price: plan.price,
        currency: plan.currency,
        startDate,
        endDate,
        status: 'active',
        benefits: plan.benefits,
        createdAt: now(),
        updatedAt: now(),
      };
      await putItem('subscriptions', sub);
      return success(sub, 201);
    }

    if (resource === '/subscriptions/{id}' && method === 'GET') {
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Subscription ID is required');
      const sub = await getItem<Subscription>('subscriptions', { subscriptionId: id });
      if (!sub) return notFound('Subscription not found');
      if (ctx.role === 'client' && sub.ownerId !== ctx.sub) return forbidden('Subscription does not belong to you');
      return success(sub);
    }

    if (resource === '/subscriptions/{id}/cancel' && method === 'POST') {
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Subscription ID is required');
      const sub = await getItem<Subscription>('subscriptions', { subscriptionId: id });
      if (!sub) return notFound('Subscription not found');
      if (ctx.role === 'client' && sub.ownerId !== ctx.sub) return forbidden('Subscription does not belong to you');
      if (!['admin', 'client'].includes(ctx.role)) return forbidden();
      await updateItem('subscriptions', { subscriptionId: id }, { status: 'cancelled', updatedAt: now() });
      return success({ ...sub, status: 'cancelled', updatedAt: now() });
    }

    return badRequest('Unknown subscriptions endpoint');
  } catch (err) {
    console.error('Subscriptions handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    if ((err as { statusCode?: number })?.statusCode === 401) return forbidden('Authentication required');
    return internalError();
  }
};
