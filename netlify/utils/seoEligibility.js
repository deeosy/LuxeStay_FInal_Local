export const SEO_IMPRESSIONS_THRESHOLD = 100;
export const SEO_CLICKS_THRESHOLD = 5;

export async function getSeoEligibleCities(supabase) {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const since = new Date(now - thirtyDaysMs).toISOString();

  try {
    const { data, error } = await supabase
      .from('affiliate_events')
      .select('city_slug, event_type, count:count()')
      .not('city_slug', 'is', null)
      .gte('created_at', since);

    if (error) {
      console.error('getSeoEligibleCities query error', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const cityMap = new Map();

    for (const row of data) {
      const slug = row.city_slug;
      if (!slug) {
        continue;
      }

      if (!cityMap.has(slug)) {
        cityMap.set(slug, {
          city_slug: slug,
          impressions: 0,
          clicks: 0
        });
      }

      const entry = cityMap.get(slug);
      const count = row.count || 0;

      if (row.event_type === 'hotel_impression') {
        entry.impressions += count;
      } else if (row.event_type === 'view_deal_click') {
        entry.clicks += count;
      }
    }

    const eligible = [];

    for (const entry of cityMap.values()) {
      if (
        entry.impressions >= SEO_IMPRESSIONS_THRESHOLD &&
        entry.clicks >= SEO_CLICKS_THRESHOLD
      ) {
        eligible.push(entry);
      }
    }

    return eligible;
  } catch (error) {
    console.error('getSeoEligibleCities unexpected error', error);
    return [];
  }
}

