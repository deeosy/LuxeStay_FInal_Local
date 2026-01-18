import { createClient } from '@supabase/supabase-js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: 'Missing Supabase configuration',
    };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      body: 'Invalid JSON body',
    };
  }

  const { event_type, hotel_id, city_slug, filter_slug, page_url } = payload || {};

  if (!event_type || !hotel_id) {
    return {
      statusCode: 400,
      body: 'Missing event_type or hotel_id',
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabase.from('affiliate_events').insert({
    event_type,
    hotel_id,
    city_slug: city_slug || null,
    filter_slug: filter_slug || null,
    page_url: page_url || null,
  });

  if (error) {
    console.error('Failed to insert affiliate event', error);
    return {
      statusCode: 500,
      body: 'Failed to log event',
    };
  }

  return {
    statusCode: 204,
    body: '',
  };
}

