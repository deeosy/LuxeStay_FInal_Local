import { createClient } from '@supabase/supabase-js';
import { getSeoIndexableCitySlugs } from '../utils/getSeoIndexableCitySlugs.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null;

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  if (!supabase) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Supabase credentials are missing'
      })
    };
  }

  try {
    const slugs = await getSeoIndexableCitySlugs(supabase);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eligibleSlugs: Array.isArray(slugs) ? slugs : []
      })
    };
  } catch (error) {
    console.error('seo-city-eligibility error', error);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        eligibleSlugs: []
      })
    };
  }
}

