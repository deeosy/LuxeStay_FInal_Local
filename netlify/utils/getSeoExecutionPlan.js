import { getSeoPromotionActions } from './getSeoPromotionActions.js';
import { getSeoIndexingStats } from './getSeoIndexingStats.js';
import { getSeoIndexingHealthState } from './getSeoIndexingHealthState.js';
import { getSeoSystemConfig } from './getSeoSystemConfig.js';

const EMPTY_PLAN = {
  promote: {
    priorityIncrease: [],
    reindex: []
  },
  maintain: {
    monitor: []
  },
  demote: {
    deprioritize: []
  },
  freeze: {
    stopIndexing: []
  },
  meta: {
    healthBlocked: false,
    reason: null
  }
};

export async function getSeoExecutionPlan(supabase) {
  if (!supabase) {
    return JSON.parse(JSON.stringify(EMPTY_PLAN));
  }

  try {
    const [config, actions, indexingStats, health] = await Promise.all([
      getSeoSystemConfig(supabase),
      getSeoPromotionActions(supabase),
      getSeoIndexingStats(supabase),
      getSeoIndexingHealthState(supabase)
    ]);

    const plan = JSON.parse(JSON.stringify(EMPTY_PLAN));

    if (!config || config.seoEnabled !== true) {
      plan.meta.healthBlocked = true;
      plan.meta.reason = 'SEO system disabled';
      return plan;
    }

    const promote = Array.isArray(actions?.promote) ? actions.promote : [];
    const maintain = Array.isArray(actions?.maintain) ? actions.maintain : [];
    const demote = Array.isArray(actions?.demote) ? actions.demote : [];
    const freeze = Array.isArray(actions?.freeze) ? actions.freeze : [];

    if (maintain.length > 0) {
      plan.maintain.monitor.push(...maintain);
    }

    if (demote.length > 0) {
      plan.demote.deprioritize.push(...demote);
    }

    if (freeze.length > 0) {
      plan.freeze.stopIndexing.push(...freeze);
    }

    if (promote.length > 0) {
      const { data: queueRows, error } = await supabase
        .from('seo_index_queue')
        .select('city_slug, status')
        .in('city_slug', promote);

      if (error) {
        console.error('getSeoExecutionPlan seo_index_queue query error', error);
        plan.promote.reindex.push(...promote);
      } else {
        const byCity = new Map();

        if (Array.isArray(queueRows)) {
          for (const row of queueRows) {
            const slug = row.city_slug;
            if (!slug) {
              continue;
            }
            const status = row.status || 'pending';
            let entry = byCity.get(slug);
            if (!entry) {
              entry = {
                hasSubmitted: false,
                hasPendingOrFailed: false
              };
              byCity.set(slug, entry);
            }
            if (status === 'submitted') {
              entry.hasSubmitted = true;
            } else if (status === 'pending' || status === 'failed') {
              entry.hasPendingOrFailed = true;
            }
          }
        }

        for (const slug of promote) {
          const entry = byCity.get(slug);
          if (entry && entry.hasSubmitted && !entry.hasPendingOrFailed) {
            plan.promote.priorityIncrease.push(slug);
          } else {
            plan.promote.reindex.push(slug);
          }
        }
      }
    }

    const hasBacklog =
      indexingStats &&
      typeof indexingStats === 'object' &&
      (indexingStats.pending > 0 || indexingStats.retrying > 0);

    if (hasBacklog && plan.promote.priorityIncrease.length > 0) {
      const moved = plan.promote.priorityIncrease.splice(0, plan.promote.priorityIncrease.length);
      plan.promote.reindex.push(...moved);
    }

    const isHealthy = health && health.healthy === true;

    if (!isHealthy) {
      plan.promote.priorityIncrease = [];
      plan.promote.reindex = [];
      plan.meta.healthBlocked = true;
      plan.meta.reason =
        (health && typeof health.reason === 'string' && health.reason) ||
        'Indexing health check failed';
    }

    return plan;
  } catch (error) {
    console.error('getSeoExecutionPlan error', error);
    return JSON.parse(JSON.stringify(EMPTY_PLAN));
  }
}
