/**
 * HTTP response helpers for Lambda handlers.
 * All responses include CORS headers and consistent JSON error format.
 */

import type { ApiResponse, ApiError } from './types';

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

export function success(body: unknown, statusCode = 200): ApiResponse {
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: CORS_HEADERS,
  };
}

export function noContent(): ApiResponse {
  return {
    statusCode: 204,
    body: '',
    headers: CORS_HEADERS,
  };
}

export function error(
  errorName: string,
  message: string,
  statusCode: number,
  requestId?: string
): ApiResponse {
  const body: ApiError = {
    error: errorName,
    message,
    requestId: requestId ?? generateRequestId(),
  };
  return {
    statusCode,
    body: JSON.stringify(body),
    headers: CORS_HEADERS,
  };
}

export function badRequest(message: string, requestId?: string): ApiResponse {
  return error('BadRequest', message, 400, requestId);
}

export function unauthorized(message = 'Authentication required', requestId?: string): ApiResponse {
  return error('Unauthorized', message, 401, requestId);
}

export function forbidden(message = 'You do not have permission to perform this action', requestId?: string): ApiResponse {
  return error('Forbidden', message, 403, requestId);
}

export function notFound(message = 'Resource not found', requestId?: string): ApiResponse {
  return error('NotFound', message, 404, requestId);
}

export function conflict(message: string, requestId?: string): ApiResponse {
  return error('Conflict', message, 409, requestId);
}

export function rateLimited(message = 'Too many requests. Please try again later.', requestId?: string): ApiResponse {
  return error('RateLimited', message, 429, requestId);
}

export function internalError(message = 'Internal server error', requestId?: string): ApiResponse {
  return error('InternalError', message, 500, requestId);
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function parseBody(event: { body?: string | null }): Record<string, unknown> {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

export function getPathParam(event: { pathParameters?: Record<string, string | null> | null }, name: string): string | undefined {
  return event.pathParameters?.[name] ?? undefined;
}

export function getQueryParam(event: { queryStringParameters?: Record<string, string | null> | null }, name: string): string | undefined {
  return event.queryStringParameters?.[name] ?? undefined;
}
