import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  // Only allow POST or scheduled trigger (if Netlify supports it, usually via build hooks or external cron)
  // For now, we expose it as an endpoint we can call.
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, body: 'Missing Supabase credentials' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Starting Revenue Engine update...');

    // 1. Fetch all clicks
    // In a real high-scale app, we would process only recent ones or use database aggregation.
    // Here we fetch all to rebuild the performance table.
    const { data: clicks, error } = await supabase
      .from('affiliate_clicks')
      .select('hotel_id, hotel_name, city, offer_price, offer_commission');

    if (error) throw error;

    if (!clicks || clicks.length === 0) {
      return { statusCode: 200, body: 'No clicks to process.' };
    }

    // 2. Aggregate Data
    const stats = {};
    let totalRevenue = 0;
    let totalClicks = 0;

    clicks.forEach(click => {
      const hid = click.hotel_id;
      if (!hid) return;

      if (!stats[hid]) {
        stats[hid] = {
          hotel_id: hid,
          city: click.city,
          clicks: 0,
          revenue: 0,
          epc: 0
        };
      }

      stats[hid].clicks += 1;
      
      const rev = (click.offer_price || 0) * (click.offer_commission || 0);
      stats[hid].revenue += rev;
      
      totalRevenue += rev;
      totalClicks += 1;
    });

    // 3. Calculate EPC for each hotel
    const updates = Object.values(stats).map(stat => {
      stat.epc = stat.clicks > 0 ? (stat.revenue / stat.clicks) : 0;
      stat.last_updated = new Date().toISOString();
      return stat;
    });

    // 4. Calculate Site Average EPC
    const siteAverageEPC = totalClicks > 0 ? (totalRevenue / totalClicks) : 0;

    // Add Global Stats Row
    updates.push({
      hotel_id: 'GLOBAL_SETTINGS',
      city: 'GLOBAL',
      clicks: totalClicks,
      revenue: totalRevenue,
      epc: siteAverageEPC,
      last_updated: new Date().toISOString(),
      is_hidden: false
    });

    // 5. Batch Upsert into hotel_performance
    // Supabase upsert requires specifying the conflict key
    const { error: upsertError } = await supabase
      .from('hotel_performance')
      .upsert(updates, { onConflict: 'hotel_id' });

    if (upsertError) throw upsertError;

    console.log(`Updated performance for ${updates.length} hotels. Global EPC: ${siteAverageEPC}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Hotel performance updated successfully',
        count: updates.length,
        globalEPC: siteAverageEPC
      })
    };

  } catch (err) {
    console.error('Revenue Engine Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
