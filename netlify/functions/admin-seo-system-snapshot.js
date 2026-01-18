import { createClient } from '@supabase/supabase-js';
import { getSeoSystemSnapshot } from '../utils/getSeoSystemSnapshot.js';

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
    const snapshot = await getSeoSystemSnapshot(supabase);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(snapshot)
    };
  } catch (error) {
    console.error('admin-seo-system-snapshot error', error);

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

