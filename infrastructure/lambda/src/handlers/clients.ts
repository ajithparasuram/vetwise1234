/**
 * Clients (Owners) Lambda Handler
 *
 * Endpoints:
 *   GET    /clients           — List clients (admin, frontdesk, doctor)
 *   POST   /clients           — Create client (admin, frontdesk)
 *   PUT    /clients/{id}      — Update client (admin, frontdesk, or self)
 *
 * Role permissions:
 *   admin:     full access
 *   frontdesk: read + create + update
 *   doctor:    read only
 *   client:    read own profile only, update own profile only
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, forbidden, notFound, internalError, parseBody, getPathParam } from '../shared/response';
import { requireAuth, requireRole } from '../shared/auth';
import { scanTable, getItem, putItem, updateItem, uuid, now } from '../shared/db';
import { pickFields, sanitizeString, validateRequired } from '../shared/validation';
import type { Owner } from '../shared/types';

const ALLOWED_FIELDS = ['name', 'city', 'phone', 'email', 'address', 'status'];

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    const ctx = requireAuth(event);

    if (method === 'GET') {
      // admin/frontdesk/doctor can list all; client gets only their own
      if (ctx.role === 'client') {
        const owner = await getItem<Owner>('owners', { ownerId: ctx.sub });
        if (!owner) return success([]);
        return success([owner]);
      }
      if (['admin', 'frontdesk', 'doctor'].includes(ctx.role)) {
        const clients = await scanTable<Owner>('owners');
        return success(clients);
      }
      return forbidden();
    }

    if (method === 'POST') {
      if (!['admin', 'frontdesk'].includes(ctx.role)) return forbidden('Only admin and front desk can create clients');
      const body = parseBody(event);
      const missing = validateRequired(body, ['name', 'phone']);
      if (missing) return badRequest(missing);
      const fields = pickFields<Owner>(body, ALLOWED_FIELDS);
      const owner: Owner = {
        ownerId: uuid(),
        name: sanitizeString(body.name),
        city: sanitizeString(body.city),
        phone: sanitizeString(body.phone),
        email: sanitizeString(body.email),
        address: sanitizeString(body.address),
        joinedDate: now(),
        status: 'active',
        cognitoSub: '',
        organizationId: ctx.organizationId ?? '',
        createdAt: now(),
        updatedAt: now(),
        ...fields,
      };
      await putItem('owners', owner);
      return success(owner, 201);
    }

    if (method === 'PUT') {
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Client ID is required');
      // Clients can only update their own profile
      if (ctx.role === 'client' && id !== ctx.sub) return forbidden('You can only update your own profile');
      if (!['admin', 'frontdesk', 'client'].includes(ctx.role)) return forbidden();
      const body = parseBody(event);
      const fields = pickFields<Owner>(body, ALLOWED_FIELDS);
      const existing = await getItem<Owner>('owners', { ownerId: id });
      if (!existing) return notFound('Client not found');
      await updateItem('owners', { ownerId: id }, { ...fields, updatedAt: now() });
      const updated = { ...existing, ...fields, updatedAt: now() };
      return success(updated);
    }

    return badRequest('Method not allowed');
  } catch (err) {
    console.error('Clients handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 401) return forbidden();
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    return internalError();
  }
};
