import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { processSeoIndexQueue } from '../utils/processSeoIndexQueue.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null;

export const handler = schedule('*/15 * * * *', async () => {
  if (!supabase) {
    console.error(
      'process-seo-index-queue: Supabase credentials are missing, aborting run'
    );
    return {
      statusCode: 500
    };
  }

  try {
    const summary = await processSeoIndexQueue(supabase);

    return {
      statusCode: 200,
      body: JSON.stringify(summary)
    };
  } catch (error) {
    console.error('process-seo-index-queue: unexpected error', error);

    return {
      statusCode: 500
    };
  }
});

