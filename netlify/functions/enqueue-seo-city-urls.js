import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getSeoIndexableCitySlugs } from '../utils/getSeoIndexableCitySlugs.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null;

export const handler = schedule('0 3 * * *', async () => {
  if (!supabase) {
    console.error('enqueue-seo-city-urls: Supabase credentials are missing');
    return {
      statusCode: 500
    };
  }

  try {
    const slugs = await getSeoIndexableCitySlugs(supabase);

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return {
        statusCode: 200,
        body: 'No SEO-eligible cities found'
      };
    }

    const rows = slugs.map((citySlug) => ({
      url: `https://luxestayhaven.com/hotels/${citySlug}`,
      city_slug: citySlug
    }));

    const { error } = await supabase
      .from('seo_index_queue')
      .upsert(rows, { onConflict: 'url' });

    if (error) {
      console.error('enqueue-seo-city-urls: upsert error', error);
      return {
        statusCode: 500
      };
    }

    return {
      statusCode: 200,
      body: `Enqueued ${rows.length} SEO-eligible city URLs`
    };
  } catch (error) {
    console.error('enqueue-seo-city-urls: unexpected error', error);
    return {
      statusCode: 500
    };
  }
});

