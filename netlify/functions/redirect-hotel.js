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
    const params = event.queryStringParameters || {};
    const { city, hotel, price, page, checkIn, checkOut, guests } = params;

    // Initialize Supabase (Use Service Role Key for writing if available, else Anon)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let supabase = null;
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn("Supabase credentials missing in redirect-hotel function");
    }

    const LITEAPI_KEY = process.env.LITEAPI_KEY_SANDBOX || process.env.VITE_LITEAPI_KEY;
    
    // Default Fallback: Redirect to the hotel detail page on the site
    // We avoid constructing a direct API URL with the key to prevent exposing secrets
    let finalUrl = `https://luxestayhaven.com/hotel/${hotelId}`;
    
    // Attempt to get a better booking URL via Supabase function if possible
    // (This matches go-hotel logic but keeps this function standalone if needed)
    let selectedOffer = null;

    // ------------------------------------
    // Smart Redirect Prioritization Logic
    // ------------------------------------
    // If we have dates, we can fetch real offers and pick the best one (Highest Commission -> Lowest Price)
    if (checkIn && checkOut && LITEAPI_KEY) {
        try {
            console.log(`Optimizing redirect for hotel ${hotelId} (${checkIn} to ${checkOut})`);
            
            const ratesUrl = 'https://api.liteapi.travel/v3.0/hotels/rates';
            const body = {
                checkin: checkIn,
                checkout: checkOut,
                currency: 'USD',
                guestNationality: 'US',
                occupancies: [{ rooms: 1, adults: parseInt(guests || '2'), children: [] }],
                hotelIds: [hotelId]
            };
            
            const res = await fetch(ratesUrl, {
                method: 'POST',
                headers: {
                    'X-API-Key': LITEAPI_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            if (res.ok) {
                const data = await res.json();
                const hotelData = data.data?.[0];
                
                if (hotelData && hotelData.rooms) {
                    const allRates = [];
                    
                    // Flatten all rates from all rooms
                    hotelData.rooms.forEach(room => {
                        if (room.rates) {
                            room.rates.forEach(rate => {
                                // Calculate Commission
                                const retail = rate.retailRate?.total?.amount || 0;
                                const net = rate.netRate?.total?.amount || 0;
                                const commission = retail - net;
                                const commissionRate = retail > 0 ? commission / retail : 0;
                                
                                // Find booking URL
                                const bookUrl = rate.booking_url || rate.deeplink || rate.paymentUrl;
                                
                                if (bookUrl) {
                                    allRates.push({
                                        price: retail,
                                        commission,
                                        commissionRate,
                                        provider: rate.source || 'liteapi',
                                        url: bookUrl,
                                        name: room.name
                                    });
                                }
                            });
                        }
                    });
                    
                    // Sort: Highest Commission -> Lowest Price
                    allRates.sort((a, b) => {
                        if (Math.abs(b.commission - a.commission) > 0.01) {
                            return b.commission - a.commission; // High commission first
                        }
                        return a.price - b.price; // Low price second
                    });
                    
                    if (allRates.length > 0) {
                        selectedOffer = allRates[0];
                        finalUrl = selectedOffer.url;
                        console.log(`Selected offer: $${selectedOffer.price} (Comm: $${selectedOffer.commission.toFixed(2)})`);
                    } else {
                        console.log("No valid rates found with booking URLs");
                    }
                }
            } else {
                console.warn(`LiteAPI rates fetch failed: ${res.status}`);
            }
        } catch (err) {
            console.error("Optimization failed, using fallback:", err);
        }
    }

    // ------------------------------------
    // Tracking & Logging
    // ------------------------------------
    if (supabase) {
      const ip = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
      const userAgent = event.headers['user-agent'] || 'unknown';

      // We await to ensure logging happens before lambda freezes
      await supabase.from('affiliate_clicks').insert({
        hotel_id: hotelId,
        hotel_name: hotel ? decodeURIComponent(hotel) : null,
        city: city ? decodeURIComponent(city) : null,
        page_path: page ? decodeURIComponent(page) : null,
        price: selectedOffer ? selectedOffer.price : (price ? parseFloat(price) : null),
        source: 'liteapi',
        ip_hash: ipHash,
        user_agent: userAgent,
        // Revenue Intelligence Fields
        offer_price: selectedOffer?.price || null,
        offer_provider: selectedOffer?.provider || null,
        offer_commission: selectedOffer?.commissionRate || null
      });
    }

    return {
      statusCode: 302,
      headers: {
        Location: finalUrl,
        "Cache-Control": "no-cache"
      }
    };
  } catch (error) {
    console.error("Redirect Error:", error);
    // Ultimate Fallback
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
