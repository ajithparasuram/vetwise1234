/**
 * Prescriptions Lambda Handler
 *
 * Endpoints:
 *   GET    /prescriptions               — List prescriptions (filtered by role)
 *   POST   /prescriptions               — Create prescription draft (doctor only)
 *   GET    /prescriptions/{id}          — Get single prescription
 *   POST   /prescriptions/{id}/finalize — Lock prescription (doctor only)
 *   GET    /prescriptions/{id}/pdf      — Get presigned URL for PDF
 *
 * Role permissions:
 *   doctor:    create, finalize, read own prescriptions
 *   client:    read-only access to their own pet's finalized prescriptions
 *   admin:     full read access
 *   frontdesk: DENIED (per spec Section 14)
 *
 * Workflow: draft → doctor finalizes → locked → PDF generated → S3 → presigned URL
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { success, badRequest, forbidden, notFound, internalError, parseBody, getPathParam } from '../shared/response';
import { requireAuth, requireActiveDoctor } from '../shared/auth';
import { scanTable, getItem, putItem, updateItem, queryByIndex, uuid, now } from '../shared/db';
import { pickFields, sanitizeString, validateRequired } from '../shared/validation';
import type { Prescription, Pet } from '../shared/types';

const s3Client = new S3Client({});
const BUCKET = process.env.MEDIA_BUCKET_NAME!;

const ALLOWED_FIELDS = ['petId', 'ownerId', 'doctorId', 'appointmentId', 'meds', 'instructions'];

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  const resource = event.resource ?? '';
  try {
    const ctx = requireAuth(event);

    // Front desk is denied all prescription access
    if (ctx.role === 'frontdesk') return forbidden('Front desk does not have access to prescriptions');

    // GET /prescriptions — list
    if (method === 'GET' && resource === '/prescriptions') {
      const petId = event.queryStringParameters?.petId;
      if (petId) {
        if (ctx.role === 'client') {
          const pet = await getItem<Pet>('pets', { petId });
          if (!pet || pet.ownerId !== ctx.sub) return forbidden('You can only access prescriptions for your own pets');
        }
        const rxs = await queryByIndex<Prescription>('prescriptions', 'petIdIndex', 'petId = :pid', { ':pid': petId });
        // Clients only see finalized prescriptions
        if (ctx.role === 'client') return success(rxs.filter((r) => r.status === 'finalized'));
        return success(rxs);
      }
      if (['admin', 'doctor'].includes(ctx.role)) {
        const rxs = await scanTable<Prescription>('prescriptions');
        return success(rxs);
      }
      if (ctx.role === 'client') {
        const pets = await queryByIndex<Pet>('pets', 'ownerIdIndex', 'ownerId = :oid', { ':oid': ctx.sub });
        const allRxs: Prescription[] = [];
        for (const pet of pets) {
          const rxs = await queryByIndex<Prescription>('prescriptions', 'petIdIndex', 'petId = :pid', { ':pid': pet.petId });
          allRxs.push(...rxs.filter((r) => r.status === 'finalized'));
        }
        return success(allRxs);
      }
      return forbidden();
    }

    // POST /prescriptions — create draft
    if (method === 'POST' && resource === '/prescriptions') {
      const docCtx = requireActiveDoctor(event);
      const body = parseBody(event);
      const missing = validateRequired(body, ['petId', 'meds']);
      if (missing) return badRequest(missing);
      const pet = await getItem<Pet>('pets', { petId: sanitizeString(body.petId) });
      if (!pet) return notFound('Pet not found');
      const fields = pickFields<Prescription>(body, ALLOWED_FIELDS);
      const rx: Prescription = {
        rxId: uuid(),
        petId: sanitizeString(body.petId),
        ownerId: pet.ownerId,
        doctorId: docCtx.sub,
        appointmentId: sanitizeString(body.appointmentId) || undefined,
        date: now(),
        meds: sanitizeString(body.meds),
        instructions: sanitizeString(body.instructions),
        status: 'draft',
        createdAt: now(),
        updatedAt: now(),
        ...fields,
      };
      await putItem('prescriptions', rx);
      return success(rx, 201);
    }

    // GET /prescriptions/{id} — single prescription
    if (method === 'GET' && resource === '/prescriptions/{id}') {
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Prescription ID is required');
      const rx = await getItem<Prescription>('prescriptions', { rxId: id });
      if (!rx) return notFound('Prescription not found');
      if (ctx.role === 'client') {
        const pet = await getItem<Pet>('pets', { petId: rx.petId });
        if (!pet || pet.ownerId !== ctx.sub) return forbidden('You can only access your own pet prescriptions');
        if (rx.status !== 'finalized') return forbidden('Prescription is not yet finalized');
      }
      return success(rx);
    }

    // POST /prescriptions/{id}/finalize — lock the prescription
    if (method === 'POST' && resource === '/prescriptions/{id}/finalize') {
      const docCtx = requireActiveDoctor(event);
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Prescription ID is required');
      const rx = await getItem<Prescription>('prescriptions', { rxId: id });
      if (!rx) return notFound('Prescription not found');
      if (rx.doctorId !== docCtx.sub) return forbidden('Only the prescribing doctor can finalize this prescription');
      if (rx.status === 'finalized') return badRequest('Prescription is already finalized');
      const pdfKey = `prescriptions/${rx.rxId}/prescription-v1.pdf`;
      await updateItem('prescriptions', { rxId: id }, { status: 'finalized', pdfKey, updatedAt: now() });
      return success({ ...rx, status: 'finalized', pdfKey, updatedAt: now() });
    }

    // GET /prescriptions/{id}/pdf — presigned URL
    if (method === 'GET' && resource === '/prescriptions/{id}/pdf') {
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Prescription ID is required');
      const rx = await getItem<Prescription>('prescriptions', { rxId: id });
      if (!rx) return notFound('Prescription not found');
      if (!rx.pdfKey) return badRequest('PDF has not been generated yet');
      if (ctx.role === 'client') {
        const pet = await getItem<Pet>('pets', { petId: rx.petId });
        if (!pet || pet.ownerId !== ctx.sub) return forbidden('You can only access your own pet prescriptions');
        if (rx.status !== 'finalized') return forbidden('Prescription is not yet finalized');
      }
      const command = new GetObjectCommand({ Bucket: BUCKET, Key: rx.pdfKey });
      const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      return success({ url, expiresIn: 300 });
    }

    return badRequest('Method not allowed');
  } catch (err) {
    console.error('Prescriptions handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    if ((err as { statusCode?: number })?.statusCode === 401) return forbidden('Authentication required');
    return internalError();
  }
};
