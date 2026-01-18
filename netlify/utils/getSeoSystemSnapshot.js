import { getSeoSystemConfig } from './getSeoSystemConfig.js';
import { getSeoIndexingHealthState } from './getSeoIndexingHealthState.js';
import { getSeoIndexingStats } from './getSeoIndexingStats.js';

const EMPTY_SNAPSHOT = {
  seoEnabled: false,
  health: {
    healthy: false,
    reason: null
  },
  queue: {
    total: 0,
    pending: 0,
    submitted: 0,
    failed: 0,
    retrying: 0,
    dead: 0
  },
  lastIndexedAt: null
};

/*
Operator checklist for SEO verification:
1. Verify sitemap: load /sitemap.xml (and Netlify sitemap function) and confirm city URLs exist and match current inventory.
2. Verify queue movement: call /admin-seo-indexing-status and /admin-seo-indexing-ops to confirm pending moves to submitted or failed over time.
3. Understand "pending forever": if pending stays high and submitted does not grow, check /admin-seo-execution-plan and /admin-seo-system-status for healthBlocked or seoEnabled=false.
4. Understand "dead": rows counted as dead have failed repeatedly; investigate affected city slugs via /admin-seo-indexing-ops before re-enqueueing or changing eligibility.
5. Kill switch usage: if traffic or errors spike unexpectedly, set seo_enabled.enabled=false in seo_system_config, confirm via /admin-seo-system-status, and wait for queue activity to stop.
6. When not to panic: new sites, sandboxes, or recently launched cities may show few submitted URLs and many pending entries while Google indexing warms up; monitor lastIndexedAt and basic movement, not absolute counts.
*/

function cloneEmptySnapshot() {
  return JSON.parse(JSON.stringify(EMPTY_SNAPSHOT));
}

export async function getSeoSystemSnapshot(supabase) {
  if (!supabase) {
    return cloneEmptySnapshot();
  }

  try {
    const [config, health, stats] = await Promise.all([
      getSeoSystemConfig(supabase),
      getSeoIndexingHealthState(supabase),
      getSeoIndexingStats(supabase)
    ]);

    const snapshot = cloneEmptySnapshot();

    snapshot.seoEnabled = !!(config && config.seoEnabled === true);

    if (health && typeof health === 'object') {
      snapshot.health.healthy = health.healthy === true;
      snapshot.health.reason =
        typeof health.reason === 'string' ? health.reason : null;
    }

    if (stats && typeof stats === 'object') {
      snapshot.queue.total =
        typeof stats.total === 'number' ? stats.total : 0;
      snapshot.queue.pending =
        typeof stats.pending === 'number' ? stats.pending : 0;
      snapshot.queue.submitted =
        typeof stats.submitted === 'number' ? stats.submitted : 0;
      snapshot.queue.failed =
        typeof stats.failed === 'number' ? stats.failed : 0;
      snapshot.queue.retrying =
        typeof stats.retrying === 'number' ? stats.retrying : 0;
      snapshot.queue.dead =
        typeof stats.dead === 'number' ? stats.dead : 0;
    }

    const { data: lastRow, error: lastError } = await supabase
      .from('seo_index_queue')
      .select('created_at')
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) {
      console.error('getSeoSystemSnapshot lastIndexedAt query error', lastError);
    } else if (lastRow && lastRow.created_at) {
      snapshot.lastIndexedAt = lastRow.created_at;
    }

    return snapshot;
  } catch (error) {
    console.error('getSeoSystemSnapshot unexpected error', error);
    return cloneEmptySnapshot();
  }
}


