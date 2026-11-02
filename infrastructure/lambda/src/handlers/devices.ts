/**
 * Devices Lambda Handler — FCM push notification device registration
 *
 * Endpoints:
 *   POST   /devices           — Register or update device token
 *   GET    /devices           — List devices for the authenticated user
 *   DELETE /devices/{tokenId}  — Remove device registration
 *
 * Role permissions:
 *   All authenticated roles can register and manage their own devices.
 *   Supports multiple devices per account. Token refresh updates in place.
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, forbidden, notFound, internalError, parseBody, getPathParam } from '../shared/response';
import { requireAuth } from '../shared/auth';
import { putItem, getItem, queryByIndex, deleteItem, uuid, now } from '../shared/db';
import { sanitizeString } from '../shared/validation';

export interface Device {
  deviceId: string;
  userId: string;
  fcmToken: string;
  platform: string;
  appVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  const resource = event.resource ?? '';
  try {
    const ctx = requireAuth(event);

    if (resource === '/devices' && method === 'POST') {
      const body = parseBody(event);
      const fcmToken = sanitizeString(body.fcmToken);
      if (!fcmToken) return badRequest('fcmToken is required');

      const platform = sanitizeString(body.platform) || 'android';
      const appVersion = sanitizeString(body.appVersion) || undefined;

      // Check if this token already exists for this user (token refresh)
      const existing = await queryByIndex<Device>('devices', 'userIdIndex', 'userId = :uid', { ':uid': ctx.sub });
      const match = existing.find((d) => d.fcmToken === fcmToken);

      if (match) {
        // Update in place
        const updated: Device = { ...match, platform, appVersion, updatedAt: now() };
        await putItem('devices', updated);
        return success(updated);
      }

      const device: Device = {
        deviceId: uuid(),
        userId: ctx.sub,
        fcmToken,
        platform,
        appVersion,
        createdAt: now(),
        updatedAt: now(),
      };
      await putItem('devices', device);
      return success(device, 201);
    }

    if (resource === '/devices' && method === 'GET') {
      const devices = await queryByIndex<Device>('devices', 'userIdIndex', 'userId = :uid', { ':uid': ctx.sub });
      return success(devices);
    }

    if (resource === '/devices/{tokenId}' && method === 'DELETE') {
      const tokenId = getPathParam(event, 'tokenId');
      if (!tokenId) return badRequest('Device ID is required');
      const existing = await getItem<Device>('devices', { deviceId: tokenId });
      if (!existing) return notFound('Device not found');
      if (existing.userId !== ctx.sub) return forbidden('You can only remove your own devices');
      await deleteItem('devices', { deviceId: tokenId });
      return success({ removed: true });
    }

    return badRequest('Unknown devices endpoint');
  } catch (err) {
    console.error('Devices handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    if ((err as { statusCode?: number })?.statusCode === 401) return forbidden('Authentication required');
    return internalError();
  }
};
