import { getSeoCityRegistry } from './seoCityRegistry.js';

export async function getSeoIndexableCitySlugs(supabase) {
  try {
    const registry = await getSeoCityRegistry(supabase);

    if (!registry || typeof registry !== 'object') {
      return [];
    }

    const slugs = Object.entries(registry)
      .filter(([, value]) => value && value.eligible === true)
      .map(([slug]) => slug)
      .sort((a, b) => a.localeCompare(b));

    return slugs;
  } catch (error) {
    console.error('getSeoIndexableCitySlugs error', error);
    return [];
  }
}

