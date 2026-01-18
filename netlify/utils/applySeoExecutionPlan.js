import { getSeoExecutionPlan } from './getSeoExecutionPlan.js';

const EMPTY_RESULT = {
  promote: {
    priorityIncrease: {
      applied: [],
      skipped: []
    },
    reindex: {
      applied: [],
      skipped: []
    }
  },
  maintain: {
    monitor: {
      applied: [],
      skipped: []
    }
  },
  demote: {
    deprioritize: {
      applied: [],
      skipped: []
    }
  },
  freeze: {
    stopIndexing: {
      applied: [],
      skipped: []
    }
  }
};

const BASE_URL = 'https://luxestayhaven.com';

function cloneEmptyResult() {
  return JSON.parse(JSON.stringify(EMPTY_RESULT));
}

function isPlanEmpty(plan) {
  if (!plan || typeof plan !== 'object') {
    return true;
  }

  const promotePriority = Array.isArray(plan.promote?.priorityIncrease)
    ? plan.promote.priorityIncrease
    : [];
  const promoteReindex = Array.isArray(plan.promote?.reindex)
    ? plan.promote.reindex
    : [];
  const maintainMonitor = Array.isArray(plan.maintain?.monitor)
    ? plan.maintain.monitor
    : [];
  const demoteDeprioritize = Array.isArray(plan.demote?.deprioritize)
    ? plan.demote.deprioritize
    : [];
  const freezeStopIndexing = Array.isArray(plan.freeze?.stopIndexing)
    ? plan.freeze.stopIndexing
    : [];

  return (
    promotePriority.length === 0 &&
    promoteReindex.length === 0 &&
    maintainMonitor.length === 0 &&
    demoteDeprioritize.length === 0 &&
    freezeStopIndexing.length === 0
  );
}

export async function applySeoExecutionPlan(supabase) {
  if (!supabase) {
    return cloneEmptyResult();
  }

  try {
    const plan = await getSeoExecutionPlan(supabase);

    if (isPlanEmpty(plan)) {
      console.log('applySeoExecutionPlan: empty plan, nothing to apply');
      return cloneEmptyResult();
    }

    const result = cloneEmptyResult();

    const priorityIncreaseSlugs = Array.isArray(plan.promote?.priorityIncrease)
      ? plan.promote.priorityIncrease
      : [];
    const reindexSlugs = Array.isArray(plan.promote?.reindex)
      ? plan.promote.reindex
      : [];
    const monitorSlugs = Array.isArray(plan.maintain?.monitor)
      ? plan.maintain.monitor
      : [];
    const deprioritizeSlugs = Array.isArray(plan.demote?.deprioritize)
      ? plan.demote.deprioritize
      : [];
    const stopIndexingSlugs = Array.isArray(plan.freeze?.stopIndexing)
      ? plan.freeze.stopIndexing
      : [];

    const registrySlugsSet = new Set([
      ...priorityIncreaseSlugs,
      ...deprioritizeSlugs,
      ...stopIndexingSlugs
    ]);

    const registryMap = new Map();

    if (registrySlugsSet.size > 0) {
      const registrySlugs = Array.from(registrySlugsSet).filter(Boolean);

      if (registrySlugs.length > 0) {
        const { data: registryRows, error: registryError } = await supabase
          .from('seo_city_registry')
          .select('city_slug, priority, is_frozen')
          .in('city_slug', registrySlugs);

        if (registryError) {
          console.error('applySeoExecutionPlan registry query error', registryError);
        } else if (Array.isArray(registryRows)) {
          for (const row of registryRows) {
            if (row && row.city_slug) {
              registryMap.set(row.city_slug, row);
            }
          }
        }
      }
    }

    if (priorityIncreaseSlugs.length > 0) {
      const upsertRows = [];

      for (const slug of priorityIncreaseSlugs) {
        if (!slug) {
          continue;
        }
        const existing = registryMap.get(slug);
        if (existing && existing.priority === 'high') {
          result.promote.priorityIncrease.skipped.push(slug);
          continue;
        }
        upsertRows.push({
          city_slug: slug,
          priority: 'high',
          is_frozen: existing ? existing.is_frozen === true : false
        });
      }

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('seo_city_registry')
          .upsert(upsertRows, { onConflict: 'city_slug' });

        if (upsertError) {
          console.error('applySeoExecutionPlan priorityIncrease upsert error', upsertError);
          for (const row of upsertRows) {
            result.promote.priorityIncrease.skipped.push(row.city_slug);
          }
        } else {
          for (const row of upsertRows) {
            result.promote.priorityIncrease.applied.push(row.city_slug);
          }
          console.log(
            'applySeoExecutionPlan priorityIncrease applied',
            upsertRows.map((row) => row.city_slug)
          );
        }
      }
    }

    if (deprioritizeSlugs.length > 0) {
      const upsertRows = [];

      for (const slug of deprioritizeSlugs) {
        if (!slug) {
          continue;
        }
        const existing = registryMap.get(slug);
        if (existing && existing.priority === 'low') {
          result.demote.deprioritize.skipped.push(slug);
          continue;
        }
        upsertRows.push({
          city_slug: slug,
          priority: 'low',
          is_frozen: existing ? existing.is_frozen === true : false
        });
      }

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('seo_city_registry')
          .upsert(upsertRows, { onConflict: 'city_slug' });

        if (upsertError) {
          console.error('applySeoExecutionPlan deprioritize upsert error', upsertError);
          for (const row of upsertRows) {
            result.demote.deprioritize.skipped.push(row.city_slug);
          }
        } else {
          for (const row of upsertRows) {
            result.demote.deprioritize.applied.push(row.city_slug);
          }
          console.log(
            'applySeoExecutionPlan deprioritize applied',
            upsertRows.map((row) => row.city_slug)
          );
        }
      }
    }

    if (stopIndexingSlugs.length > 0) {
      const upsertRows = [];

      for (const slug of stopIndexingSlugs) {
        if (!slug) {
          continue;
        }
        const existing = registryMap.get(slug);
        if (existing && existing.is_frozen === true) {
          result.freeze.stopIndexing.skipped.push(slug);
          continue;
        }
        upsertRows.push({
          city_slug: slug,
          priority: existing && existing.priority ? existing.priority : 'normal',
          is_frozen: true
        });
      }

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('seo_city_registry')
          .upsert(upsertRows, { onConflict: 'city_slug' });

        if (upsertError) {
          console.error('applySeoExecutionPlan stopIndexing upsert error', upsertError);
          for (const row of upsertRows) {
            result.freeze.stopIndexing.skipped.push(row.city_slug);
          }
        } else {
          for (const row of upsertRows) {
            result.freeze.stopIndexing.applied.push(row.city_slug);
          }
          console.log(
            'applySeoExecutionPlan stopIndexing applied',
            upsertRows.map((row) => row.city_slug)
          );
        }
      }
    }

    if (monitorSlugs.length > 0) {
      for (const slug of monitorSlugs) {
        if (!slug) {
          continue;
        }
        result.maintain.monitor.skipped.push(slug);
      }
      console.log('applySeoExecutionPlan monitor noop', monitorSlugs);
    }

    if (reindexSlugs.length > 0) {
      const urls = reindexSlugs
        .filter(Boolean)
        .map((slug) => `${BASE_URL}/hotels/${slug}`);

      if (urls.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from('seo_index_queue')
          .select('url, status')
          .in('url', urls);

        const byUrl = new Map();

        if (existingError) {
          console.error('applySeoExecutionPlan reindex query error', existingError);
        } else if (Array.isArray(existingRows)) {
          for (const row of existingRows) {
            if (row && row.url) {
              byUrl.set(row.url, row.status || 'pending');
            }
          }
        }

        const upsertRows = [];

        for (const slug of reindexSlugs) {
          if (!slug) {
            continue;
          }
          const url = `${BASE_URL}/hotels/${slug}`;
          const status = byUrl.get(url);
          if (status === 'pending') {
            result.promote.reindex.skipped.push(slug);
            continue;
          }
          upsertRows.push({
            url,
            city_slug: slug,
            status: 'pending',
            attempts: 0,
            last_attempt_at: null
          });
        }

        if (upsertRows.length > 0) {
          const { error: upsertError } = await supabase
            .from('seo_index_queue')
            .upsert(upsertRows, { onConflict: 'url' });

          if (upsertError) {
            console.error('applySeoExecutionPlan reindex upsert error', upsertError);
            for (const row of upsertRows) {
              result.promote.reindex.skipped.push(row.city_slug);
            }
          } else {
            for (const row of upsertRows) {
              result.promote.reindex.applied.push(row.city_slug);
            }
            console.log(
              'applySeoExecutionPlan reindex applied',
              upsertRows.map((row) => row.city_slug)
            );
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error('applySeoExecutionPlan error', error);
    return cloneEmptyResult();
  }
}

