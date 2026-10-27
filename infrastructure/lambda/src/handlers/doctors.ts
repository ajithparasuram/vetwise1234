/**
 * Doctors Lambda Handler
 *
 * Endpoints:
 *   GET  /doctors              — List all doctors (admin, frontdesk, client)
 *   POST /doctors              — Create doctor record (admin only)
 *   GET  /doctors/pending      — List pending doctors (admin only)
 *   POST /doctors/{id}/approve — Approve doctor (admin only)
 *   POST /doctors/{id}/reject  — Reject doctor (admin only)
 *
 * Approval workflow:
 *   1. Admin authenticates
 *   2. Backend verifies admin role
 *   3. Update Doctor record approvalStatus
 *   4. Update Cognito custom:approvalStatus attribute
 *   5. Both states synchronized
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { success, badRequest, forbidden, notFound, internalError, parseBody, getPathParam } from '../shared/response';
import { requireAuth, requireRole } from '../shared/auth';
import { scanTable, getItem, putItem, updateItem, queryByIndex, uuid, now } from '../shared/db';
import { pickFields, sanitizeString, validateRequired } from '../shared/validation';
import type { Doctor } from '../shared/types';

const cognitoClient = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

const ALLOWED_FIELDS = ['name', 'email', 'phone', 'specialty', 'license', 'experience', 'clinic', 'organizationId'];

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  const resource = event.resource ?? '';
  try {
    const ctx = requireAuth(event);

    if (resource === '/doctors' && method === 'GET') {
      const doctors = await scanTable<Doctor>('doctors');
      // Clients only see active doctors
      if (ctx.role === 'client') return success(doctors.filter((d) => d.approvalStatus === 'active'));
      if (['admin', 'frontdesk', 'doctor'].includes(ctx.role)) return success(doctors);
      return forbidden();
    }

    if (resource === '/doctors' && method === 'POST') {
      if (ctx.role !== 'admin') return forbidden('Only admin can create doctor records');
      const body = parseBody(event);
      const missing = validateRequired(body, ['name', 'email', 'phone']);
      if (missing) return badRequest(missing);
      const fields = pickFields<Doctor>(body, ALLOWED_FIELDS);
      const doctor: Doctor = {
        doctorId: uuid(),
        cognitoSub: '',
        name: sanitizeString(body.name),
        email: sanitizeString(body.email),
        phone: sanitizeString(body.phone),
        specialty: sanitizeString(body.specialty),
        license: sanitizeString(body.license),
        experience: sanitizeString(body.experience),
        clinic: sanitizeString(body.clinic),
        organizationId: ctx.organizationId ?? '',
        approvalStatus: 'active',
        appliedDate: now(),
        joinedDate: now(),
        createdAt: now(),
        updatedAt: now(),
        ...fields,
      };
      await putItem('doctors', doctor);
      return success(doctor, 201);
    }

    if (resource === '/doctors/pending' && method === 'GET') {
      if (ctx.role !== 'admin') return forbidden('Only admin can view pending doctors');
      const pending = await queryByIndex<Doctor>('doctors', 'approvalStatusIndex', 'approvalStatus = :s', { ':s': 'pending' });
      return success(pending);
    }

    if (resource === '/doctors/{id}/approve' && method === 'POST') {
      if (ctx.role !== 'admin') return forbidden('Only admin can approve doctors');
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Doctor ID is required');
      const doctor = await getItem<Doctor>('doctors', { doctorId: id });
      if (!doctor) return notFound('Doctor not found');
      if (doctor.approvalStatus === 'active') return badRequest('Doctor is already approved');

      // Update DynamoDB
      await updateItem('doctors', { doctorId: id }, {
        approvalStatus: 'active',
        joinedDate: now(),
        updatedAt: now(),
      });

      // Update Cognito custom attribute
      if (doctor.cognitoSub) {
        try {
          await cognitoClient.send(new AdminUpdateUserAttributesCommand({
            UserPoolId: USER_POOL_ID,
            Username: doctor.email,
            UserAttributes: [
              { Name: 'custom:approvalStatus', Value: 'active' },
            ],
          }));
        } catch (cogErr) {
          console.error('Failed to update Cognito approval status:', cogErr);
          // Compensating transaction: roll back DynamoDB
          await updateItem('doctors', { doctorId: id }, {
            approvalStatus: 'pending',
            joinedDate: undefined,
            updatedAt: now(),
          });
          return internalError('Failed to synchronize Cognito approval status. Rolled back.');
        }
      }

      return success({ ...doctor, approvalStatus: 'active', joinedDate: now(), updatedAt: now() });
    }

    if (resource === '/doctors/{id}/reject' && method === 'POST') {
      if (ctx.role !== 'admin') return forbidden('Only admin can reject doctors');
      const id = getPathParam(event, 'id');
      if (!id) return badRequest('Doctor ID is required');
      const doctor = await getItem<Doctor>('doctors', { doctorId: id });
      if (!doctor) return notFound('Doctor not found');

      await updateItem('doctors', { doctorId: id }, {
        approvalStatus: 'rejected',
        updatedAt: now(),
      });

      if (doctor.cognitoSub) {
        try {
          await cognitoClient.send(new AdminUpdateUserAttributesCommand({
            UserPoolId: USER_POOL_ID,
            Username: doctor.email,
            UserAttributes: [
              { Name: 'custom:approvalStatus', Value: 'rejected' },
            ],
          }));
        } catch (cogErr) {
          console.error('Failed to update Cognito rejection status:', cogErr);
          await updateItem('doctors', { doctorId: id }, { approvalStatus: 'pending', updatedAt: now() });
          return internalError('Failed to synchronize Cognito status. Rolled back.');
        }
      }

      return success({ ...doctor, approvalStatus: 'rejected', updatedAt: now() });
    }

    return badRequest('Unknown doctors endpoint');
  } catch (err) {
    console.error('Doctors handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 403) return forbidden((err as Error).message);
    if ((err as { statusCode?: number })?.statusCode === 401) return forbidden('Authentication required');
    return internalError();
  }
};
