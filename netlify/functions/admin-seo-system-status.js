import { createClient } from '@supabase/supabase-js';
import { getSeoSystemConfig } from '../utils/getSeoSystemConfig.js';

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
    const config = await getSeoSystemConfig(supabase);

    const { data, error } = await supabase
      .from('seo_system_config')
      .select('updated_at')
      .eq('key', 'seo_enabled')
      .maybeSingle();

    if (error) {
      console.error('admin-seo-system-status updated_at query error', error);
    }

    const updatedAt = data && data.updated_at ? data.updated_at : null;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        seoEnabled: config && config.seoEnabled === true,
        updated_at: updatedAt
      })
    };
  } catch (error) {
    console.error('admin-seo-system-status error', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal Server Error'
      })
    };
  }
}

