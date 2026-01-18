import { getSeoEligibleCities } from './seoEligibility.js';

export async function getSeoCityRegistry(supabase) {
  try {
    const eligibleCities = await getSeoEligibleCities(supabase);

    if (!Array.isArray(eligibleCities) || eligibleCities.length === 0) {
      return {};
    }

    const registry = {};

    for (const city of eligibleCities) {
      if (!city || !city.city_slug) {
        continue;
      }

      registry[city.city_slug] = {
        eligible: true,
        impressions: city.impressions || 0,
        clicks: city.clicks || 0
      };
    }

    return registry;
  } catch (error) {
    console.error('getSeoCityRegistry error', error);
    return {};
  }
}

