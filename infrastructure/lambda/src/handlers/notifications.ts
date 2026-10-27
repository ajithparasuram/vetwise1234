/**
 * Notifications Lambda Handler
 *
 * Endpoints:
 *   GET /notifications — List notifications for the authenticated user
 *
 * Notifications are event-driven. Other handlers emit notification events
 * by writing to VetWise-Notifications. This handler reads them.
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, forbidden, internalError } from '../shared/response';
import { requireAuth } from '../shared/auth';
import { queryByIndex } from '../shared/db';
import type { Notification } from '../shared/types';

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    const ctx = requireAuth(event);

    if (method === 'GET') {
      const notifications = await queryByIndex<Notification>(
        'notifications',
        'recipientIdIndex',
        'recipientId = :rid',
        { ':rid': ctx.sub }
      );
      return success(notifications);
    }

    return badRequest('Method not allowed');
  } catch (err) {
    console.error('Notifications handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden();
    if ((err as { statusCode?: number })?.statusCode === 401) return forbidden('Authentication required');
    return internalError();
  }
};
