export async function getSeoRevenueStats(supabase) {
  if (!supabase) {
    return {};
  }

  try {
    const statsByCity = {};

    const { data: eventRows, error: eventsError } = await supabase
      .from('affiliate_events')
      .select('city_slug, event_type, count:count()')
      .not('city_slug', 'is', null);

    if (eventsError) {
      console.error('getSeoRevenueStats affiliate_events error', eventsError);
    } else if (eventRows && eventRows.length > 0) {
      for (const row of eventRows) {
        const slug = row.city_slug;
        if (!slug) {
          continue;
        }

        if (!statsByCity[slug]) {
          statsByCity[slug] = {
            impressions: 0,
            clicks: 0,
            revenue: 0,
            conversionRate: 0
          };
        }

        const count = row.count || 0;

        if (row.event_type === 'hotel_impression') {
          statsByCity[slug].impressions += count;
        } else if (row.event_type === 'view_deal_click') {
          statsByCity[slug].clicks += count;
        }
      }
    }

    const { data: clickRows, error: clicksError } = await supabase
      .from('affiliate_clicks')
      .select('city, offer_price, offer_commission');

    if (clicksError) {
      console.error('getSeoRevenueStats affiliate_clicks error', clicksError);
    } else if (clickRows && clickRows.length > 0) {
      for (const row of clickRows) {
        const rawCity = row.city;
        if (!rawCity) {
          continue;
        }

        const slugKey = String(rawCity).toLowerCase();

        if (!statsByCity[slugKey]) {
          statsByCity[slugKey] = {
            impressions: 0,
            clicks: 0,
            revenue: 0,
            conversionRate: 0
          };
        }

        const price = Number(row.offer_price) || 0;
        const commissionRate = Number(row.offer_commission) || 0;
        const revenue = price * commissionRate;

        if (revenue > 0) {
          statsByCity[slugKey].revenue += revenue;
        }
      }
    }

    for (const [slug, entry] of Object.entries(statsByCity)) {
      const impressions = entry.impressions || 0;
      const clicks = entry.clicks || 0;

      if (impressions > 0 && clicks > 0) {
        entry.conversionRate = clicks / impressions;
      } else {
        entry.conversionRate = 0;
      }

      entry.impressions = impressions;
      entry.clicks = clicks;
      entry.revenue = entry.revenue || 0;
    }

    return statsByCity;
  } catch (error) {
    console.error('getSeoRevenueStats unexpected error', error);
    return {};
  }
}

