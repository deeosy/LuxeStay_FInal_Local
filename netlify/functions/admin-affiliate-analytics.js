import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN;
  if (!adminToken) {
    return {
      statusCode: 500,
      body: 'Missing ADMIN_DASHBOARD_TOKEN',
    };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const expected = `Bearer ${adminToken}`;

  if (authHeader !== expected) {
    return {
      statusCode: 401,
      body: 'Unauthorized',
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: 'Missing Supabase configuration',
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: cityRows, error: cityError } = await supabase
      .from('affiliate_events')
      .select('city_slug, event_type, count:count()')
      .in('event_type', ['hotel_impression', 'view_deal_click']);

    if (cityError) {
      throw cityError;
    }

    const cityMap = new Map();

    if (cityRows) {
      for (const row of cityRows) {
        const slug = row.city_slug || 'unknown';
        const key = slug;
        if (!cityMap.has(key)) {
          cityMap.set(key, {
            city_slug: slug,
            impressions: 0,
            clicks: 0,
          });
        }
        const entry = cityMap.get(key);
        if (row.event_type === 'hotel_impression') {
          entry.impressions += row.count || 0;
        } else if (row.event_type === 'view_deal_click') {
          entry.clicks += row.count || 0;
        }
      }
    }

    const cityFunnel = Array.from(cityMap.values())
      .map((entry) => {
        const impressions = entry.impressions || 0;
        const clicks = entry.clicks || 0;
        const ctr = impressions > 0 ? clicks / impressions : 0;
        return {
          city_slug: entry.city_slug,
          impressions,
          clicks,
          ctr,
        };
      })
      .sort((a, b) => b.impressions - a.impressions);

    const { data: exitRows, error: exitError } = await supabase
      .from('affiliate_events')
      .select('city_slug, event_type, count:count()')
      .in('event_type', ['exit_intent_view', 'exit_intent_click']);

    if (exitError) {
      throw exitError;
    }

    const exitMap = new Map();

    if (exitRows) {
      for (const row of exitRows) {
        const slug = row.city_slug || 'unknown';
        const key = slug;
        if (!exitMap.has(key)) {
          exitMap.set(key, {
            city_slug: slug,
            views: 0,
            clicks: 0,
          });
        }
        const entry = exitMap.get(key);
        if (row.event_type === 'exit_intent_view') {
          entry.views += row.count || 0;
        } else if (row.event_type === 'exit_intent_click') {
          entry.clicks += row.count || 0;
        }
      }
    }

    const exitIntent = Array.from(exitMap.values())
      .map((entry) => {
        const views = entry.views || 0;
        const clicks = entry.clicks || 0;
        const ctr = views > 0 ? clicks / views : 0;
        return {
          city_slug: entry.city_slug,
          views,
          clicks,
          ctr,
        };
      })
      .sort((a, b) => b.views - a.views);

    const { data: impressionRows, error: impressionError } = await supabase
      .from('affiliate_events')
      .select('hotel_id, city_slug, count:count()')
      .eq('event_type', 'hotel_impression');

    if (impressionError) {
      throw impressionError;
    }

    const { data: clickRows, error: clickError } = await supabase
      .from('affiliate_events')
      .select('hotel_id, count:count()')
      .eq('event_type', 'view_deal_click');

    if (clickError) {
      throw clickError;
    }

    const clickSet = new Set();
    if (clickRows) {
      for (const row of clickRows) {
        if (row.hotel_id) {
          clickSet.add(row.hotel_id);
        }
      }
    }

    const leakHotels = [];

    if (impressionRows) {
      for (const row of impressionRows) {
        if (!row.hotel_id) {
          continue;
        }
        if (clickSet.has(row.hotel_id)) {
          continue;
        }
        leakHotels.push({
          hotel_id: row.hotel_id,
          city_slug: row.city_slug || 'unknown',
          impressions: row.count || 0,
        });
      }
    }

    leakHotels.sort((a, b) => b.impressions - a.impressions);

    const limitedLeakHotels = leakHotels.slice(0, 200);

    const result = {
      cityFunnel,
      exitIntent,
      leakHotels: limitedLeakHotels,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('admin-affiliate-analytics error', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
}

