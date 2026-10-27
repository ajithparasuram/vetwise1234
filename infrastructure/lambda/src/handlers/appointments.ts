/**
 * Appointments Lambda Handler
 *
 * Endpoints:
 *   GET    /appointments          — List appointments (filtered by role)
 *   POST   /appointments          — Create appointment
 *   PUT    /appointments/{id}     — Update appointment (reschedule, cancel)
 *
 * Role permissions:
 *   client:    read/create/update own appointments
 *   doctor:    read appointments assigned to them, update status
 *   admin:     full access
 *   frontdesk: read + create + update
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, forbidden, notFound, internalError, parseBody, getPathParam } from '../shared/response';
import { requireAuth } from '../shared/auth';
import { scanTable, getItem, putItem, updateItem, queryByIndex, uuid, now } from '../shared/db';
import { pickFields, sanitizeString, validateRequired } from '../shared/validation';
import type { Appointment } from '../shared/types';

const ALLOWED_FIELDS = ['time', 'date', 'petId', 'doctorId', 'reason', 'visitType', 'location', 'status'];

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    const ctx = requireAuth(event);

    if (method === 'GET') {
      if (ctx.role === 'client') {
        const appts = await queryByIndex<Appointment>('appointments', 'ownerIdIndex', 'ownerId = :oid', { ':oid': ctx.sub });
        return success(appts);
      }
      if (ctx.role === 'doctor') {
        const appts = await queryByIndex<Appointment>('appointments', 'doctorIdIndex', 'doctorId = :did', { ':did': ctx.sub });
        return success(appts);
      }
      if (['admin', 'frontdesk'].includes(ctx.role)) {
        const appts = await scanTable<Appointment>('appointments');
        return success(appts);
      }
      return forbidden();
    }

    if (method === 'POST') {
      const body = parseBody(event);
      const missing = validateRequired(body, ['date', 'time', 'petId']);
      if (missing) return badRequest(missing);
      const fields = pickFields<Appointment>(body, ALLOWED_FIELDS);
      const appt: Appointment = {
        appointmentId: uuid(),
        time: sanitizeString(body.time),
        date: sanitizeString(body.date),
        petId: sanitizeString(body.petId),
        ownerId: ctx.role === 'client' ? ctx.sub : sanitizeString(body.ownerId) || ctx.sub,
        doctorId: sanitizeString(body.doctorId),
        reason: sanitizeString(body.reason),
        visitType: sanitizeString(body.visitType) || 'clinic',
        location: sanitizeString(body.location),
        status: 'pending',
        createdAt: now(),
        updatedAt: now(),
        ...fields,
      };
      await putItem('appointments', appt);
      return success(appt, 201);
    }

    if (method === 'PUT') {
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Appointment ID is required');
      const existing = await getItem<Appointment>('appointments', { appointmentId: id });
      if (!existing) return notFound('Appointment not found');
      if (ctx.role === 'client' && existing.ownerId !== ctx.sub) return forbidden('You can only update your own appointments');
      if (!['admin', 'frontdesk', 'client', 'doctor'].includes(ctx.role)) return forbidden();
      const body = parseBody(event);
      const fields = pickFields<Appointment>(body, ALLOWED_FIELDS);
      await updateItem('appointments', { appointmentId: id }, { ...fields, updatedAt: now() });
      return success({ ...existing, ...fields, updatedAt: now() });
    }

    return badRequest('Method not allowed');
  } catch (err) {
    console.error('Appointments handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    return internalError();
  }
};
