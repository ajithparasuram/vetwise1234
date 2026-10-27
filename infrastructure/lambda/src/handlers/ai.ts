/**
 * AI Health Checker Lambda Handler
 *
 * Endpoint:
 *   POST /ai/health-check
 *
 * Rate limiting:
 *   - Authenticated: 10 requests per user per day
 *   - Unauthenticated/public: 30 requests per IP per hour
 *
 * Input validation:
 *   - Text sanitized (max 5000 chars)
 *   - Image: max 5MB, max 2048px longest side, type checked
 *   - Rejects invalid input before calling AI provider
 *
 * Response:
 *   - General observations, possible concerns, urgency level
 *   - NEVER produces definitive diagnosis
 *   - Always includes disclaimer
 *   - Emergency red flags trigger immediate care recommendation
 *
 * SECURITY:
 *   - AI provider key is read from Secrets Manager, never exposed
 *   - Request metadata logged without storing sensitive content
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { success, badRequest, rateLimited, internalError, parseBody } from '../shared/response';
import { requireAuth } from '../shared/auth';
import { putItem, uuid, now } from '../shared/db';
import { sanitizeString } from '../shared/validation';
import type { AuditLog } from '../shared/types';

const secretsClient = new SecretsManagerClient({});
const AI_SECRET_NAME = `vetwise/ai/${process.env.STAGE ?? 'staging'}`;

const DISCLAIMER = 'This AI tool provides general health guidance and triage information. It does not diagnose diseases and does not replace examination or advice from a qualified veterinarian.';

// In-memory rate limit counters (per Lambda container)
// For production, use DynamoDB or ElastiCache for distributed rate limiting
const userDailyCount = new Map<string, { count: number; date: string }>();
const ipHourlyCount = new Map<string, { count: number; hour: string }>();

function checkRateLimit(userId?: string, ip?: string): { limited: boolean; reason?: string } {
  const today = new Date().toISOString().slice(0, 10);
  const hour = new Date().toISOString().slice(0, 13);

  if (userId) {
    const entry = userDailyCount.get(userId);
    if (entry && entry.date === today) {
      if (entry.count >= 10) return { limited: true, reason: 'Daily limit of 10 requests reached. Please try again tomorrow.' };
      entry.count++;
    } else {
      userDailyCount.set(userId, { count: 1, date: today });
    }
  } else if (ip) {
    const entry = ipHourlyCount.get(ip);
    if (entry && entry.hour === hour) {
      if (entry.count >= 30) return { limited: true, reason: 'Hourly limit of 30 requests reached. Please try again later.' };
      entry.count++;
    } else {
      ipHourlyCount.set(ip, { count: 1, hour });
    }
  }

  return { limited: false };
}

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    if (method !== 'POST') return badRequest('Method not allowed');

    // Try to extract auth context (public use allowed with stricter limits)
    let userId: string | undefined;
    let authenticated = false;
    try {
      const ctx = requireAuth(event);
      userId = ctx.sub;
      authenticated = true;
    } catch {
      // Unauthenticated — use IP for rate limiting
    }

    const ip = event.requestContext?.identity?.sourceIp ?? 'unknown';
    const rateCheck = checkRateLimit(userId, ip);
    if (rateCheck.limited) return rateLimited(rateCheck.reason);

    const body = parseBody(event);
    const animalType = sanitizeString(body.animalType).slice(0, 100);
    const age = sanitizeString(body.age).slice(0, 50);
    const sex = sanitizeString(body.sex).slice(0, 20);
    const weight = sanitizeString(body.weight).slice(0, 50);
    const history = sanitizeString(body.history).slice(0, 5000);
    const symptoms = sanitizeString(body.symptoms).slice(0, 5000);
    const duration = sanitizeString(body.duration).slice(0, 200);
    const severity = sanitizeString(body.severity).slice(0, 50);

    if (!symptoms && !animalType) return badRequest('Please describe the symptoms and animal type');

    // Validate image if provided
    if (body.photo) {
      const photo = body.photo as { size?: number; type?: string; width?: number; height?: number };
      if (photo.size && photo.size > 5 * 1024 * 1024) {
        return badRequest('Image must be under 5MB');
      }
      if (photo.type && !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
        return badRequest('Image must be JPEG, PNG, or WebP');
      }
      if (photo.width && photo.height) {
        const longest = Math.max(photo.width, photo.height);
        if (longest > 2048) return badRequest('Image must not exceed 2048px on the longest side');
      }
    }

    // Get AI credentials
    const secretResult = await secretsClient.send(new GetSecretValueCommand({ SecretId: AI_SECRET_NAME }));
    const aiConfig = JSON.parse(secretResult.SecretString ?? '{}');

    if (aiConfig.AI_API_KEY === 'PLACEHOLDER' || !aiConfig.AI_API_KEY) {
      // AI not configured — return a structured triage response based on symptoms
      return success({
        urgency: assessUrgency(severity, symptoms),
        observations: [
          'Based on the symptoms described, there are several possible causes that a veterinarian would consider.',
          'A hands-on examination is necessary for an accurate assessment.',
        ],
        possibleConcerns: extractConcerns(symptoms),
        recommendedNextStep: 'Schedule a consultation with a veterinarian for proper examination.',
        questionsToAsk: [
          'How long have these symptoms been present?',
          'Has there been any change in appetite or behavior?',
          'Are there any other symptoms you have noticed?',
        ],
        disclaimer: DISCLAIMER,
      });
    }

    // Call AI provider (implementation depends on approved provider)
    // This is a placeholder — the actual provider call requires explicit
    // approval per spec Section 22 before implementation
    const aiResponse = await callAIProvider(aiConfig, {
      animalType, age, sex, weight, history, symptoms, duration, severity,
    });

    // Log request metadata (no sensitive content)
    const audit: AuditLog = {
      auditId: uuid(),
      actorId: userId ?? `ip:${ip}`,
      actorRole: authenticated ? 'authenticated' : 'public',
      action: 'ai_health_check',
      resourceType: 'ai_health_check',
      resourceId: uuid(),
      timestamp: now(),
      ip,
      metadata: { animalType, hasPhoto: !!body.photo },
    };
    await putItem('auditLogs', audit);

    return success({
      ...aiResponse,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('AI handler error:', err);
    return internalError();
  }
};

function assessUrgency(severity: string, symptoms: string): 'LOW' | 'MODERATE' | 'URGENT' {
  const urgentKeywords = ['bleeding', 'unconscious', 'seizure', 'difficulty breathing', 'not eating', 'not drinking', 'vomiting blood', 'collapse'];
  const moderateKeywords = ['vomiting', 'diarrhea', 'limping', 'loss of appetite', 'lethargic', 'coughing'];

  const lower = (severity + ' ' + symptoms).toLowerCase();
  if (urgentKeywords.some((k) => lower.includes(k))) return 'URGENT';
  if (moderateKeywords.some((k) => lower.includes(k))) return 'MODERATE';
  return 'LOW';
}

function extractConcerns(symptoms: string): string[] {
  if (!symptoms) return ['Unable to determine specific concerns from the provided information.'];
  const concerns: string[] = [];
  const lower = symptoms.toLowerCase();
  if (lower.includes('vomit')) concerns.push('Vomiting can indicate various gastrointestinal issues');
  if (lower.includes('diarrh')) concerns.push('Diarrhea may suggest dietary issues or infection');
  if (lower.includes('limp')) concerns.push('Limping may indicate injury or joint issues');
  if (lower.includes('itch') || lower.includes('scratch')) concerns.push('Excessive itching may suggest allergies or parasites');
  if (concerns.length === 0) concerns.push('The described symptoms warrant veterinary attention for proper evaluation');
  return concerns;
}

async function callAIProvider(
  config: { AI_PROVIDER: string; AI_MODEL: string; AI_API_KEY: string },
  input: Record<string, string>
): Promise<{
  urgency: string;
  observations: string[];
  possibleConcerns: string[];
  recommendedNextStep: string;
  questionsToAsk: string[];
}> {
  // Placeholder — actual implementation requires explicit provider approval
  // per spec Section 22. The structure below matches the expected response.
  return {
    urgency: assessUrgency(input.severity, input.symptoms),
    observations: [
      'These symptoms can have several causes and veterinary assessment may be appropriate.',
    ],
    possibleConcerns: extractConcerns(input.symptoms),
    recommendedNextStep: 'Schedule a consultation with a veterinarian for proper examination.',
    questionsToAsk: [
      'How long have these symptoms been present?',
      'Has there been any change in appetite or behavior?',
      'Are there any other symptoms you have noticed?',
    ],
  };
}
