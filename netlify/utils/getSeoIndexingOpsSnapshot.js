const EMPTY_SNAPSHOT = {
  totals: {
    pending: 0,
    submitted: 0,
    failed: 0,
    retrying: 0,
    dead: 0
  },
  recentFailures: [],
  recentlySubmitted: []
};

function cloneEmptySnapshot() {
  return JSON.parse(JSON.stringify(EMPTY_SNAPSHOT));
}

export async function getSeoIndexingOpsSnapshot(supabase) {
  if (!supabase) {
    return cloneEmptySnapshot();
  }

  try {
    const [allRowsResult, failuresResult, submittedResult] = await Promise.all([
      supabase
        .from('seo_index_queue')
        .select('status, attempts'),
      supabase
        .from('seo_index_queue')
        .select('url, city_slug, attempts, last_attempt_at')
        .eq('status', 'failed')
        .order('last_attempt_at', { ascending: false })
        .limit(10),
      supabase
        .from('seo_index_queue')
        .select('url, city_slug, last_attempt_at')
        .eq('status', 'submitted')
        .order('last_attempt_at', { ascending: false })
        .limit(10)
    ]);

    const { data: allRows, error: allError } = allRowsResult;
    const { data: failureRows, error: failuresError } = failuresResult;
    const { data: submittedRows, error: submittedError } = submittedResult;

    if (allError) {
      console.error('getSeoIndexingOpsSnapshot totals query error', allError);
      return cloneEmptySnapshot();
    }

    const snapshot = cloneEmptySnapshot();

    if (Array.isArray(allRows) && allRows.length > 0) {
      for (const row of allRows) {
        const status = row.status || 'pending';
        const attempts = typeof row.attempts === 'number' ? row.attempts : 0;

        if (status === 'pending') {
          snapshot.totals.pending += 1;
        } else if (status === 'submitted') {
          snapshot.totals.submitted += 1;
        } else if (status === 'failed') {
          snapshot.totals.failed += 1;

          if (attempts < 3) {
            snapshot.totals.retrying += 1;
          } else {
            snapshot.totals.dead += 1;
          }
        }
      }
    }

    if (!failuresError && Array.isArray(failureRows) && failureRows.length > 0) {
      snapshot.recentFailures = failureRows.map((row) => ({
        url: row.url || '',
        city_slug: row.city_slug || null,
        attempts: typeof row.attempts === 'number' ? row.attempts : 0,
        last_attempt_at: row.last_attempt_at || null
      }));
    }

    if (!submittedError && Array.isArray(submittedRows) && submittedRows.length > 0) {
      snapshot.recentlySubmitted = submittedRows.map((row) => ({
        url: row.url || '',
        city_slug: row.city_slug || null,
        last_attempt_at: row.last_attempt_at || null
      }));
    }

    return snapshot;
  } catch (error) {
    console.error('getSeoIndexingOpsSnapshot unexpected error', error);
    return cloneEmptySnapshot();
  }
}

