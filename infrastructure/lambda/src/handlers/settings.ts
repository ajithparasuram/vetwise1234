/**
 * Settings Lambda Handler
 *
 * Endpoint:
 *   GET /settings
 *
 * Returns admin-controlled configuration. Never exposes secrets.
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, internalError } from '../shared/response';
import { requireAuth } from '../shared/auth';
import { scanTable } from '../shared/db';
import type { Plan, ServiceArea } from '../shared/types';

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    if (method !== 'GET') return badRequest('Method not allowed');

    requireAuth(event);

    const plans = await scanTable<Plan>('plans');
    const activePlans = plans.filter((p) => p.active);

    const serviceAreas = await scanTable<ServiceArea>('serviceAreas');
    const activeAreas = serviceAreas.filter((a) => a.active).map((a) => ({
      areaId: a.areaId,
      name: a.name,
      type: a.type,
      serviceTypes: a.serviceTypes,
    }));

    return success({
      brand: {
        name: 'VetWise',
        company: 'SJ Vetfolio Pvt. Ltd.',
        supportEmail: 'support@vetwise.in',
      },
      plans: activePlans.map((p) => ({
        planId: p.planId,
        name: p.name,
        price: p.price,
        currency: p.currency,
        billingInterval: p.billingInterval,
        duration: p.duration,
        benefits: p.benefits,
        taxTreatment: p.taxTreatment,
      })),
      serviceAreas: activeAreas,
      features: {
        aiHealthChecker: true,
        homeVisit: true,
        teleconsultation: true,
        vaccination: true,
      },
      booking: {
        minAdvanceHours: 2,
        maxAdvanceDays: 30,
        cancellationWindowHours: 4,
      },
    });
  } catch (err) {
    console.error('Settings handler error:', err);
    if ((err as { statusCode?: number })?.statusCode === 401) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }), headers: { 'Content-Type': 'application/json' } };
    }
    return internalError();
  }
};
