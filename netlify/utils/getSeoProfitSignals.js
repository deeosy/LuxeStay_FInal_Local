import { getSeoRevenueStats } from './getSeoRevenueStats.js';
import { getSeoIndexableCitySlugs } from './getSeoIndexableCitySlugs.js';

const REVENUE_HIGH_THRESHOLD = 100;
const CONVERSION_HIGH_THRESHOLD = 0.05;
const IMPRESSIONS_HIGH_THRESHOLD = 500;

function classifyProfit(entry) {
  const impressions = entry.impressions || 0;
  const clicks = entry.clicks || 0;
  const revenue = entry.revenue || 0;
  const conversionRate = entry.conversionRate || 0;

  if (impressions > 0 && revenue === 0) {
    return 'loss';
  }

  if (revenue >= REVENUE_HIGH_THRESHOLD && conversionRate >= CONVERSION_HIGH_THRESHOLD) {
    return 'high';
  }

  if (revenue >= REVENUE_HIGH_THRESHOLD || conversionRate >= CONVERSION_HIGH_THRESHOLD) {
    return 'medium';
  }

  if (impressions >= IMPRESSIONS_HIGH_THRESHOLD && revenue < REVENUE_HIGH_THRESHOLD) {
    return 'low';
  }

  return 'low';
}

export async function getSeoProfitSignals(supabase) {
  if (!supabase) {
    return {};
  }

  try {
    const [revenueStats, indexableSlugs] = await Promise.all([
      getSeoRevenueStats(supabase),
      getSeoIndexableCitySlugs(supabase)
    ]);

    if (!Array.isArray(indexableSlugs) || indexableSlugs.length === 0) {
      return {};
    }

    const result = {};

    for (const slug of indexableSlugs) {
      const base = revenueStats && revenueStats[slug]
        ? revenueStats[slug]
        : {
            impressions: 0,
            clicks: 0,
            revenue: 0,
            conversionRate: 0
          };

      const profitTier = classifyProfit(base);

      result[slug] = {
        impressions: base.impressions || 0,
        clicks: base.clicks || 0,
        revenue: base.revenue || 0,
        conversionRate: base.conversionRate || 0,
        profitTier
      };
    }

    return result;
  } catch (error) {
    console.error('getSeoProfitSignals error', error);
    return {};
  }
}

