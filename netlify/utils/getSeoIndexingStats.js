const EMPTY_STATS = {
  total: 0,
  pending: 0,
  submitted: 0,
  failed: 0,
  retrying: 0,
  dead: 0
};

export async function getSeoIndexingStats(supabase) {
  if (!supabase) {
    return { ...EMPTY_STATS };
  }

  try {
    const { data, error } = await supabase
      .from('seo_index_queue')
      .select('status, attempts');

    if (error) {
      console.error('getSeoIndexingStats query error', error);
      return { ...EMPTY_STATS };
    }

    if (!data || data.length === 0) {
      return { ...EMPTY_STATS };
    }

    const stats = { ...EMPTY_STATS };

    for (const row of data) {
      stats.total += 1;

      const status = row.status || 'pending';
      const attempts = typeof row.attempts === 'number' ? row.attempts : 0;

      if (status === 'pending') {
        stats.pending += 1;
      } else if (status === 'submitted') {
        stats.submitted += 1;
      } else if (status === 'failed') {
        stats.failed += 1;

        if (attempts < 3) {
          stats.retrying += 1;
        } else {
          stats.dead += 1;
        }
      }
    }

    return stats;
  } catch (error) {
    console.error('getSeoIndexingStats unexpected error', error);
    return { ...EMPTY_STATS };
  }
}

