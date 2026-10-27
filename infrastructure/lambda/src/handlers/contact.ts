/**
 * Contact Lambda Handler
 *
 * Endpoint:
 *   POST /contact
 *
 * Public endpoint with rate limiting and spam protection.
 * Stores enquiries in VetWise-ContactEnquiries for admin review.
 *
 * Body: { name, email, phone, topic, message }
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, rateLimited, internalError, parseBody } from '../shared/response';
import { putItem, uuid, now } from '../shared/db';
import { sanitizeString, validateEmail, validateRequired } from '../shared/validation';
import type { ContactEnquiry } from '../shared/types';

const ipHourlyCount = new Map<string, { count: number; hour: string }>();
const MAX_PER_HOUR = 5;

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    if (method !== 'POST') return badRequest('Method not allowed');

    // Rate limiting
    const ip = event.requestContext?.identity?.sourceIp ?? 'unknown';
    const hour = new Date().toISOString().slice(0, 13);
    const entry = ipHourlyCount.get(ip);
    if (entry && entry.hour === hour) {
      if (entry.count >= MAX_PER_HOUR) return rateLimited('Too many submissions. Please try again later.');
      entry.count++;
    } else {
      ipHourlyCount.set(ip, { count: 1, hour });
    }

    const body = parseBody(event);
    const missing = validateRequired(body, ['name', 'email', 'message']);
    if (missing) return badRequest(missing);

    const name = sanitizeString(body.name);
    const email = sanitizeString(body.email);
    const phone = sanitizeString(body.phone);
    const topic = sanitizeString(body.topic) || 'general';
    const message = sanitizeString(body.message).slice(0, 5000);

    if (!validateEmail(email)) return badRequest('A valid email is required');
    if (message.length < 10) return badRequest('Message must be at least 10 characters');

    // Basic spam check
    const spamKeywords = ['viagra', 'casino', 'crypto', 'bitcoin', 'loan', 'investment opportunity'];
    const lowerMsg = message.toLowerCase();
    if (spamKeywords.some((k) => lowerMsg.includes(k))) {
      return badRequest('Your message has been flagged as spam. Please contact support directly.');
    }

    const enquiry: ContactEnquiry = {
      enquiryId: uuid(),
      name,
      email,
      phone,
      topic,
      message,
      createdAt: now(),
    };
    await putItem('contactEnquiries', enquiry);

    return success({
      message: 'Your enquiry has been received. We will get back to you shortly.',
      enquiryId: enquiry.enquiryId,
    }, 201);
  } catch (err) {
    console.error('Contact handler error:', err);
    return internalError();
  }
};
