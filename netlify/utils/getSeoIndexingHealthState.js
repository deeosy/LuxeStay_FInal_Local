import { getSeoIndexingStats } from './getSeoIndexingStats.js';
import { getSeoIndexingOpsSnapshot } from './getSeoIndexingOpsSnapshot.js';

const EMPTY_HEALTH = {
  healthy: true,
  reason: null,
  flags: {
    backlogTooLarge: false,
    tooManyFailures: false,
    tooManyDead: false
  }
};

function cloneEmptyHealth() {
  return JSON.parse(JSON.stringify(EMPTY_HEALTH));
}

export async function getSeoIndexingHealthState(supabase) {
  if (!supabase) {
    return {
      healthy: false,
      reason: 'Supabase client is missing',
      flags: {
        backlogTooLarge: false,
        tooManyFailures: false,
        tooManyDead: false
      }
    };
  }

  try {
    const [stats, snapshot] = await Promise.all([
      getSeoIndexingStats(supabase),
      getSeoIndexingOpsSnapshot(supabase)
    ]);

    const base = stats && typeof stats === 'object' ? stats : {};

    const total = typeof base.total === 'number' ? base.total : 0;
    const pending = typeof base.pending === 'number' ? base.pending : 0;
    const retrying = typeof base.retrying === 'number' ? base.retrying : 0;
    const failed = typeof base.failed === 'number' ? base.failed : 0;
    const dead = typeof base.dead === 'number' ? base.dead : 0;

    const backlog = pending + retrying;
    const failureRatio = total > 0 ? failed / total : 0;

    const flags = {
      backlogTooLarge: backlog > 100,
      tooManyFailures: failureRatio > 0.3,
      tooManyDead: dead > 50
    };

    const triggered = Object.entries(flags)
      .filter(([, value]) => value)
      .map(([key]) => key);

    if (triggered.length === 0) {
      return cloneEmptyHealth();
    }

    const reason = `Unhealthy indexing state: ${triggered.join(', ')}`;

    return {
      healthy: false,
      reason,
      flags
    };
  } catch (error) {
    console.error('getSeoIndexingHealthState unexpected error', error);
    return {
      healthy: false,
      reason: 'Unexpected error while computing indexing health',
      flags: {
        backlogTooLarge: false,
        tooManyFailures: false,
        tooManyDead: false
      }
    };
  }
}

