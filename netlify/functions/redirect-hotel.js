import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function handler(event) {
  try {
    const hotelId = event.path.split("/").pop();

    if (!hotelId) {
      return {
        statusCode: 400,
        body: "Missing hotel id"
      };
    }

    // Parse Query Parameters
    const { city, hotel, price, page } = event.queryStringParameters || {};

    // Initialize Supabase (Use Service Role Key for writing if available, else Anon)
    // We prefer Service Role to bypass RLS for inserts if RLS is strict
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Hash IP
      const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

      // User Agent
      const userAgent = event.headers['user-agent'] || 'unknown';

      // Insert Log
      // We don't await this to be blocking if we want speed, but Netlify functions might freeze 
      // if we return before async work is done. So we SHOULD await.
      await supabase.from('affiliate_clicks').insert({
        hotel_id: hotelId,
        hotel_name: hotel ? decodeURIComponent(hotel) : null,
        city: city ? decodeURIComponent(city) : null,
        page_path: page ? decodeURIComponent(page) : null,
        price: price ? parseFloat(price) : null,
        source: 'liteapi',
        ip_hash: ipHash,
        user_agent: userAgent
      });
    } else {
      console.warn("Supabase credentials missing in redirect-hotel function");
    }

    // Sandbox LiteAPI link for now (safe)
    // Fallback to sandbox if not set, or use provided key
    const LITEAPI_KEY = process.env.LITEAPI_KEY_SANDBOX || process.env.VITE_LITEAPI_KEY;

    const url = `https://api.liteapi.travel/v3/hotels/${hotelId}/book?apiKey=${LITEAPI_KEY}`;

    return {
      statusCode: 302,
      headers: {
        Location: url,
        "Cache-Control": "no-cache"
      }
    };
  } catch (error) {
    console.error("Redirect Error:", error);
    // Even if tracking fails, we should still redirect
    const LITEAPI_KEY = process.env.LITEAPI_KEY_SANDBOX || process.env.VITE_LITEAPI_KEY;
    const url = `https://api.liteapi.travel/v3/hotels/${event.path.split("/").pop()}/book?apiKey=${LITEAPI_KEY}`;
    
    return {
      statusCode: 302,
      headers: {
        Location: url,
        "Cache-Control": "no-cache"
      }
    };
  }
}
