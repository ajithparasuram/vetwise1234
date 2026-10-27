/**
 * Auth context extraction from API Gateway events.
 *
 * The Cognito authorizer passes JWT claims through the request context.
 * We extract the sub, role, and other custom attributes here.
 *
 * SECURITY: Role is NEVER trusted from the request body. It comes from
 * Cognito custom attributes that are set by the backend only.
 */

import type { AuthContext, Role, ApprovalStatus } from './types';
import { unauthorized } from './response';

interface APIGatewayEvent {
  requestContext?: {
    authorizer?: {
      claims?: Record<string, string>;
    };
  };
}

const VALID_ROLES: Role[] = ['client', 'doctor', 'admin', 'frontdesk'];
const VALID_APPROVAL_STATUSES: ApprovalStatus[] = ['pending', 'active', 'rejected'];

export function extractAuth(event: APIGatewayEvent): AuthContext | null {
  const claims = event.requestContext?.authorizer?.claims;
  if (!claims) return null;

  const sub = claims['sub'];
  if (!sub) return null;

  const roleStr = claims['custom:role'] ?? '';
  const role = VALID_ROLES.includes(roleStr as Role) ? (roleStr as Role) : 'client';

  const approvalStr = claims['custom:approvalStatus'] ?? '';
  const approvalStatus = VALID_APPROVAL_STATUSES.includes(approvalStr as ApprovalStatus)
    ? (approvalStr as ApprovalStatus)
    : undefined;

  return {
    sub,
    role,
    email: claims['email'] ?? undefined,
    phone: claims['phone_number'] ?? undefined,
    name: claims['name'] ?? undefined,
    organizationId: claims['custom:organizationId'] ?? undefined,
    approvalStatus,
  };
}

export function requireAuth(event: APIGatewayEvent): AuthContext {
  const ctx = extractAuth(event);
  if (!ctx) {
    throw { statusCode: 401, message: 'Authentication required' };
  }
  return ctx;
}

export function requireRole(event: APIGatewayEvent, ...allowedRoles: Role[]): AuthContext {
  const ctx = requireAuth(event);
  if (!allowedRoles.includes(ctx.role)) {
    throw { statusCode: 403, message: `Role '${ctx.role}' is not permitted to perform this action` };
  }
  return ctx;
}

export function requireActiveDoctor(event: APIGatewayEvent): AuthContext {
  const ctx = requireRole(event, 'doctor');
  if (ctx.approvalStatus !== 'active') {
    throw {
      statusCode: 403,
      message: 'Doctor account is pending approval. Write operations are restricted until an admin approves your account.',
    };
  }
  return ctx;
}
