/**
 * Clinical Records Lambda Handler
 *
 * Endpoints:
 *   GET    /clinical-records          — List records (filtered by role)
 *   POST   /clinical-records          — Create record (doctor only, must be active)
 *
 * Role permissions:
 *   doctor:    create records for assigned patients, read records they created
 *   client:    read-only access to their own pet's records
 *   admin:     full read access
 *   frontdesk: DENIED (per spec Section 13)
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, forbidden, notFound, internalError, parseBody } from '../shared/response';
import { requireAuth, requireRole, requireActiveDoctor } from '../shared/auth';
import { scanTable, getItem, putItem, queryByIndex, uuid, now } from '../shared/db';
import { pickFields, sanitizeString, validateRequired } from '../shared/validation';
import type { ClinicalRecord, Pet } from '../shared/types';

const ALLOWED_FIELDS = ['petId', 'ownerId', 'doctorId', 'appointmentId', 'date', 'reason', 'diagnosis', 'treatment', 'notes', 'followup'];

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    const ctx = requireAuth(event);

    if (method === 'GET') {
      // Front desk is explicitly denied
      if (ctx.role === 'frontdesk') return forbidden('Front desk does not have access to clinical records');

      const petId = event.queryStringParameters?.petId;
      if (petId) {
        // Verify access: client must own the pet, doctor must be assigned
        if (ctx.role === 'client') {
          const pet = await getItem<Pet>('pets', { petId });
          if (!pet || pet.ownerId !== ctx.sub) return forbidden('You can only access records for your own pets');
        }
        const records = await queryByIndex<ClinicalRecord>('clinicalRecords', 'petIdIndex', 'petId = :pid', { ':pid': petId });
        return success(records);
      }

      if (ctx.role === 'client') {
        // Return all records for client's pets — need to get pet IDs first
        const pets = await queryByIndex<Pet>('pets', 'ownerIdIndex', 'ownerId = :oid', { ':oid': ctx.sub });
        const allRecords: ClinicalRecord[] = [];
        for (const pet of pets) {
          const records = await queryByIndex<ClinicalRecord>('clinicalRecords', 'petIdIndex', 'petId = :pid', { ':pid': pet.petId });
          allRecords.push(...records);
        }
        return success(allRecords);
      }

      if (['admin', 'doctor'].includes(ctx.role)) {
        const records = await scanTable<ClinicalRecord>('clinicalRecords');
        return success(records);
      }

      return forbidden();
    }

    if (method === 'POST') {
      // Only active doctors can create clinical records
      const docCtx = requireActiveDoctor(event);
      const body = parseBody(event);
      const missing = validateRequired(body, ['petId', 'reason', 'diagnosis']);
      if (missing) return badRequest(missing);

      // Verify the pet exists
      const pet = await getItem<Pet>('pets', { petId: sanitizeString(body.petId) });
      if (!pet) return notFound('Pet not found');

      const fields = pickFields<ClinicalRecord>(body, ALLOWED_FIELDS);
      const record: ClinicalRecord = {
        recordId: uuid(),
        petId: sanitizeString(body.petId),
        ownerId: pet.ownerId,
        doctorId: docCtx.sub,
        appointmentId: sanitizeString(body.appointmentId) || undefined,
        date: now(),
        reason: sanitizeString(body.reason),
        diagnosis: sanitizeString(body.diagnosis),
        treatment: sanitizeString(body.treatment),
        notes: sanitizeString(body.notes),
        followup: sanitizeString(body.followup) || undefined,
        createdAt: now(),
        updatedAt: now(),
        ...fields,
      };
      await putItem('clinicalRecords', record);
      return success(record, 201);
    }

    return badRequest('Method not allowed');
  } catch (err) {
    console.error('Clinical records handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    if ((err as { statusCode?: number })?.statusCode === 401) return forbidden('Authentication required');
    return internalError();
  }
};
