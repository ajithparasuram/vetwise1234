/**
 * Patients (Pets) Lambda Handler
 *
 * Endpoints:
 *   GET    /patients          — List pets (filtered by role)
 *   POST   /patients          — Create pet (client, admin, frontdesk)
 *   PUT    /patients/{id}     — Update pet (owner, admin, frontdesk)
 *
 * Role permissions:
 *   client:    read/update own pets, create pets for themselves
 *   doctor:    read pets assigned via appointments
 *   admin:     full access
 *   frontdesk: read + create + update
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, forbidden, notFound, internalError, parseBody, getPathParam } from '../shared/response';
import { requireAuth } from '../shared/auth';
import { scanTable, getItem, putItem, updateItem, queryByIndex, uuid, now } from '../shared/db';
import { pickFields, sanitizeString, validateRequired } from '../shared/validation';
import type { Pet } from '../shared/types';

const ALLOWED_FIELDS = ['name', 'species', 'breed', 'color', 'sex', 'age', 'weight', 'photoKey', 'videoKey'];

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    const ctx = requireAuth(event);

    if (method === 'GET') {
      if (ctx.role === 'client') {
        const pets = await queryByIndex<Pet>('pets', 'ownerIdIndex', 'ownerId = :oid', { ':oid': ctx.sub });
        return success(pets);
      }
      if (['admin', 'frontdesk', 'doctor'].includes(ctx.role)) {
        const pets = await scanTable<Pet>('pets');
        return success(pets);
      }
      return forbidden();
    }

    if (method === 'POST') {
      const body = parseBody(event);
      const missing = validateRequired(body, ['name', 'species']);
      if (missing) return badRequest(missing);
      const fields = pickFields<Pet>(body, ALLOWED_FIELDS);
      const pet: Pet = {
        petId: uuid(),
        name: sanitizeString(body.name),
        species: sanitizeString(body.species),
        breed: sanitizeString(body.breed),
        color: sanitizeString(body.color),
        sex: sanitizeString(body.sex),
        age: sanitizeString(body.age),
        weight: sanitizeString(body.weight),
        ownerId: ctx.role === 'client' ? ctx.sub : sanitizeString(body.ownerId) || ctx.sub,
        visits: 0,
        createdAt: now(),
        updatedAt: now(),
        ...fields,
      };
      await putItem('pets', pet);
      return success(pet, 201);
    }

    if (method === 'PUT') {
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Pet ID is required');
      const existing = await getItem<Pet>('pets', { petId: id });
      if (!existing) return notFound('Pet not found');
      // Clients can only update their own pets
      if (ctx.role === 'client' && existing.ownerId !== ctx.sub) return forbidden('You can only update your own pets');
      if (!['admin', 'frontdesk', 'client'].includes(ctx.role)) return forbidden();
      const body = parseBody(event);
      const fields = pickFields<Pet>(body, ALLOWED_FIELDS);
      await updateItem('pets', { petId: id }, { ...fields, updatedAt: now() });
      return success({ ...existing, ...fields, updatedAt: now() });
    }

    return badRequest('Method not allowed');
  } catch (err) {
    console.error('Patients handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    return internalError();
  }
};
