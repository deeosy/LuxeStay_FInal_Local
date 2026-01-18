import jwt from 'jsonwebtoken';
import { getSeoIndexingHealthState } from './getSeoIndexingHealthState.js';
import { getSeoSystemConfig } from './getSeoSystemConfig.js';

const BATCH_LIMIT = 10;
const MAX_ATTEMPTS = 3;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const INDEXING_API_URL =
  'https://indexing.googleapis.com/v3/urlNotifications:publish';

function createEmptySummary() {
  return {
    processed: 0,
    successes: 0,
    failures: 0,
    skipped: 0,
    blocked: false,
    reason: null
  };
}

async function getGoogleAccessToken() {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;

  if (!encoded) {
    console.log('processSeoIndexQueue: Google credentials missing');
    return null;
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, 'base64').toString('utf8')
  );

  const now = Math.floor(Date.now() / 1000);

  const jwtToken = jwt.sign(
    {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now
    },
    serviceAccount.private_key,
    { algorithm: 'RS256' }
  );

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken
    })
  });

  const data = await res.json();

  if (!data || !data.access_token) {
    console.error('processSeoIndexQueue: failed to obtain Google access token', data);
    return null;
  }

  return data.access_token;
}

async function submitToGoogle(url, accessToken, type = 'URL_UPDATED') {
  const res = await fetch(INDEXING_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      type
    })
  });

  const text = await res.text();

  console.log(`Google Indexing for ${url}: ${res.status} - ${text}`);

  const ok = res.status >= 200 && res.status < 300;

  return {
    ok,
    status: res.status,
    body: text
  };
}

export async function processSeoIndexQueue(supabase) {
  const summary = createEmptySummary();

  if (!supabase) {
    console.error('processSeoIndexQueue: Supabase client is missing');
    return summary;
  }

  try {
    const config = await getSeoSystemConfig(supabase);

    if (!config || config.seoEnabled !== true) {
      console.log('processSeoIndexQueue: blocked because SEO system is disabled');

      return {
        processed: 0,
        successes: 0,
        failures: 0,
        skipped: 0,
        blocked: true,
        reason: 'SEO system disabled'
      };
    }

    const health = await getSeoIndexingHealthState(supabase);

    if (!health || health.healthy === false) {
      const reason =
        (health && typeof health.reason === 'string' && health.reason) ||
        'Indexing health check failed';

      console.log(
        'processSeoIndexQueue: blocked by health state',
        reason
      );

      return {
        processed: 0,
        successes: 0,
        failures: 0,
        skipped: 0,
        blocked: true,
        reason
      };
    }

    const { data: rows, error } = await supabase
      .from('seo_index_queue')
      .select('id, url, city_slug, status, attempts, created_at')
      .or('status.eq.pending,status.eq.failed')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) {
      console.error('processSeoIndexQueue: queue query error', error);
      return summary;
    }

    if (!rows || rows.length === 0) {
      console.log('processSeoIndexQueue: no eligible rows to process');
      return summary;
    }

    const citySlugs = Array.from(
      new Set(
        rows
          .map((row) => row.city_slug)
          .filter((slug) => typeof slug === 'string' && slug.length > 0)
      )
    );

    const frozenCities = new Set();

    if (citySlugs.length > 0) {
      const { data: registryRows, error: registryError } = await supabase
        .from('seo_city_registry')
        .select('city_slug, is_frozen')
        .in('city_slug', citySlugs);

      if (registryError) {
        console.error(
          'processSeoIndexQueue: seo_city_registry query error',
          registryError
        );
      } else if (Array.isArray(registryRows)) {
        for (const row of registryRows) {
          if (row && row.city_slug && row.is_frozen === true) {
            frozenCities.add(row.city_slug);
          }
        }
      }
    }

    const accessToken = await getGoogleAccessToken();

    if (!accessToken) {
      console.log(
        'processSeoIndexQueue: aborting run because Google credentials are not available'
      );
      return summary;
    }

    const processedUrls = new Set();
    const nowIso = () => new Date().toISOString();

    for (const row of rows) {
      const id = row.id;
      const url = row.url;
      const citySlug = row.city_slug;
      const status = row.status || 'pending';
      const attempts = typeof row.attempts === 'number' ? row.attempts : 0;

      if (!url) {
        summary.skipped += 1;
        continue;
      }

      if (status === 'submitted') {
        summary.skipped += 1;
        continue;
      }

      if (processedUrls.has(url)) {
        summary.skipped += 1;
        continue;
      }

      if (citySlug && frozenCities.has(citySlug)) {
        console.log(
          `processSeoIndexQueue: skipping frozen city ${citySlug} for url ${url}`
        );
        summary.skipped += 1;
        continue;
      }

      processedUrls.add(url);

      try {
        const result = await submitToGoogle(url, accessToken);

        if (result.ok) {
          const update = {
            status: 'submitted',
            last_attempt_at: nowIso()
          };

          await supabase
            .from('seo_index_queue')
            .update(update)
            .eq('id', id);

          summary.processed += 1;
          summary.successes += 1;
        } else {
          const update = {
            status: 'failed',
            attempts: attempts + 1,
            last_attempt_at: nowIso()
          };

          await supabase
            .from('seo_index_queue')
            .update(update)
            .eq('id', id);

          summary.processed += 1;
          summary.failures += 1;
        }
      } catch (error) {
        console.error(
          `processSeoIndexQueue: unexpected error for url ${url}`,
          error
        );

        const update = {
          status: 'failed',
          attempts: attempts + 1,
          last_attempt_at: nowIso()
        };

        try {
          await supabase
            .from('seo_index_queue')
            .update(update)
            .eq('id', id);
        } catch (updateError) {
          console.error(
            'processSeoIndexQueue: failed to update row after error',
            updateError
          );
        }

        summary.processed += 1;
        summary.failures += 1;
      }
    }

    console.log('processSeoIndexQueue: run summary', summary);

    return summary;
  } catch (error) {
    console.error('processSeoIndexQueue: top-level error', error);
    return summary;
  }
}
