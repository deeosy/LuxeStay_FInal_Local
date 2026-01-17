import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  // Use Service Role Key to bypass RLS
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: 'Missing Supabase credentials' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, hotel_id, is_hidden, threshold } = JSON.parse(event.body);

    if (action === 'toggle_hide') {
      // Upsert to ensure row exists (and merge update)
      const { error } = await supabase
        .from('hotel_performance')
        .upsert({ 
            hotel_id, 
            is_hidden,
            last_updated: new Date().toISOString()
        }, { onConflict: 'hotel_id' });
      
      if (error) throw error;
      
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (action === 'set_threshold') {
       // Update GLOBAL_SETTINGS
       const { error } = await supabase
         .from('hotel_performance')
         .upsert({ 
            hotel_id: 'GLOBAL_SETTINGS',
            epc_threshold: threshold,
            last_updated: new Date().toISOString()
         }, { onConflict: 'hotel_id' });

       if (error) throw error;

       return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, body: 'Invalid action' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
