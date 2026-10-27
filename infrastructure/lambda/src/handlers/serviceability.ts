/**
 * Serviceability Lambda Handler
 *
 * Endpoint:
 *   GET /serviceability?lat=<lat>&lng=<lng>
 *
 * Checks if a location is within a configured service area.
 * Uses haversine distance against center+radius coverage geometry.
 *
 * Returns:
 *   available / not_available / coming_soon
 *   + serviceAreaName, message
 */

import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, internalError } from '../shared/response';
import { scanTable } from '../shared/db';
import { haversineKm } from '../shared/validation';
import type { ServiceArea } from '../shared/types';

export const handler = async (event: APIGatewayProxyEvent) => {
  const method = event.httpMethod;
  try {
    if (method !== 'GET') return badRequest('Method not allowed');

    const latStr = event.queryStringParameters?.lat;
    const lngStr = event.queryStringParameters?.lng;

    if (!latStr || !lngStr) return badRequest('lat and lng query parameters are required');

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) return badRequest('lat and lng must be valid numbers');
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return badRequest('Invalid coordinates');

    const areas = await scanTable<ServiceArea>('serviceAreas');
    const activeAreas = areas.filter((a) => a.active);

    for (const area of activeAreas) {
      const distance = haversineKm(lat, lng, area.coverageGeometry.centerLat, area.coverageGeometry.centerLng);
      if (distance <= area.coverageGeometry.radiusKm) {
        return success({
          status: 'available',
          serviceAreaName: area.name,
          message: `Service is available in ${area.name}.`,
          distanceKm: Math.round(distance * 10) / 10,
          serviceTypes: area.serviceTypes,
        });
      }
    }

    // Check if any area is "coming soon" (within 2x radius of any area)
    for (const area of activeAreas) {
      const distance = haversineKm(lat, lng, area.coverageGeometry.centerLat, area.coverageGeometry.centerLng);
      if (distance <= area.coverageGeometry.radiusKm * 2) {
        return success({
          status: 'coming_soon',
          serviceAreaName: area.name,
          message: `Service is coming soon to your area. Please check back shortly.`,
          distanceKm: Math.round(distance * 10) / 10,
        });
      }
    }

    return success({
      status: 'not_available',
      serviceAreaName: null,
      message: 'Service is not currently available in your area. We are expanding — please check back later.',
    });
  } catch (err) {
    console.error('Serviceability handler error:', err);
    return internalError();
  }
};
