/**
 * Field whitelisting — never persist arbitrary client input.
 * Only explicitly listed fields are extracted from the request body.
 */

export function pickFields<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  allowed: string[]
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const field of allowed) {
    if (field in body) {
      result[field] = body[field];
    }
  }
  return result as Partial<T>;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function validateRequired(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    const val = body[field];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

export function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 1000);
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
