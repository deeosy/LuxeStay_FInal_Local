import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LITEAPI_BASE_URL = 'https://api.liteapi.travel/v3.0';

// In-memory cache with TTL (15 minutes for places, 10 minutes for hotels)
const cache = new Map<string, { data: any; expires: number }>();
const PLACE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const HOTEL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const RATES_CACHE_TTL = 5 * 60 * 1000;  // 5 minutes (prices change more frequently)

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) {
    console.log(`Cache HIT: ${key}`);
    return entry.data as T;
  }
  if (entry) {
    cache.delete(key); // Clean up expired entry
  }
  return null;
}

function setCache(key: string, data: any, ttl: number): void {
  cache.set(key, { data, expires: Date.now() + ttl });
  console.log(`Cache SET: ${key} (TTL: ${ttl / 1000}s)`);
}

// Normalize LiteAPI hotel data to match our frontend format
function normalizeHotel(hotel: any, rates?: any) {
  // 1. Dig deep into the rates structure
  const firstRoom = rates?.rooms?.[0];
  const firstRate = firstRoom?.rates?.[0];

  // 2. Identify the PRICE
  const price = firstRate?.retailRate?.total?.amount 
    ? Math.round(firstRate.retailRate.total.amount / (rates?.nights || 1))
    : hotel.pricePerNight || 0;

  // 3. PRIORITY URL MAPPING (Crucial for live bookings)
  // We ignore hotel.booking_url because it's usually the sandbox fallback
  // Extract booking URL from various potential locations in LiteAPI response
  const bookingUrl = 
    hotel.booking_url || 
    hotel.deeplink || 
    hotel.partner_booking_url || 
    firstRate?.booking_url ||
    firstRate?.deeplink ||
    firstRate?.paymentUrl ||
    null;

  return {
    id: hotel.id || hotel.hotelId,
    liteApiId: hotel.id || hotel.hotelId,
    name: hotel.name || hotel.hotelName || 'Unknown Hotel',
    location: [hotel.city, hotel.country].filter(Boolean).join(', ') || hotel.address || 'Unknown Location',
    city: hotel.city,
    country: hotel.country,
    price: price,
    bookingUrl, // This will now be passed to your React frontend
    rating: hotel.starRating || hotel.rating || 4.5,
    reviews: hotel.reviewsCount || Math.floor(Math.random() * 500) + 50,
    image: hotel.main_photo || hotel.mainPhoto || hotel.images?.[0] || '/placeholder.svg',
    images: hotel.images || [hotel.main_photo || hotel.mainPhoto].filter(Boolean),
    description: hotel.description || `Experience exceptional hospitality at ${hotel.name || 'this hotel'}.`,
    amenities: hotel.facilities?.slice(0, 8) || hotel.amenities || ['Wifi', 'Restaurant', 'Concierge'],
    sqft: hotel.roomSize || Math.floor(Math.random() * 500) + 400,
    beds: hotel.bedrooms || 1,
    guests: hotel.maxOccupancy || 2,
    address: hotel.address || '',
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    rawData: { hotel, rates },
  };
}

// Get placeId from a city name search (with caching)
async function getPlaceId(apiKey: string, destination: string): Promise<string | null> {
  const cacheKey = `place:${destination.toLowerCase().trim()}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  try {
    const placesUrl = `${LITEAPI_BASE_URL}/data/places?textQuery=${encodeURIComponent(destination)}&type=locality`;
    console.log(`Fetching places: ${placesUrl}`);
    
    const response = await fetch(placesUrl, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Places API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`Places response:`, JSON.stringify(data).substring(0, 500));
    
    const place = data.data?.[0];
    if (place?.placeId) {
      console.log(`Found placeId: ${place.placeId} for "${destination}"`);
      setCache(cacheKey, place.placeId, PLACE_CACHE_TTL);
      return place.placeId;
    }
    
    console.log(`No placeId found for "${destination}"`);
    return null;
  } catch (error) {
    console.error('Places API error:', error);
    return null;
  }
}

// Get hotels by placeId using data/hotels endpoint (with caching)
async function getHotelsByPlace(apiKey: string, placeId: string, limit: number): Promise<any[]> {
  const cacheKey = `hotels:${placeId}:${limit}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const hotelsUrl = `${LITEAPI_BASE_URL}/data/hotels?placeId=${encodeURIComponent(placeId)}&limit=${limit}`;
    console.log(`Fetching hotels by placeId: ${hotelsUrl}`);
    
    const response = await fetch(hotelsUrl, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hotels API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    console.log(`Got ${data.data?.length || 0} hotels from placeId search`);
    const hotels = data.data || [];
    setCache(cacheKey, hotels, HOTEL_CACHE_TTL);
    return hotels;
  } catch (error) {
    console.error('Hotels by place error:', error);
    return [];
  }
}

// Get hotel rates for specific hotel IDs (with caching)
async function getHotelRates(
  apiKey: string, 
  hotelIds: string[], 
  checkIn: string, 
  checkOut: string, 
  guests: number,
  rooms: number = 1
): Promise<any[]> {
  const cacheKey = `rates:${hotelIds.sort().join(',')}:${checkIn}:${checkOut}:${guests}:${rooms}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const ratesUrl = `${LITEAPI_BASE_URL}/hotels/rates`;
    const requestBody = {
      checkin: checkIn,
      checkout: checkOut,
      currency: 'USD',
      guestNationality: 'US',
      occupancies: [{ rooms: rooms, adults: guests, children: [] }],
      hotelIds: hotelIds,
      includeHotelData: true,
    };

    console.log(`Fetching rates for ${hotelIds.length} hotels`);
    
    const response = await fetch(ratesUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Rates API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    console.log(`Got rates for ${data.data?.length || 0} hotels`);
    const rates = data.data || [];
    setCache(cacheKey, rates, RATES_CACHE_TTL);
    return rates;
  } catch (error) {
    console.error('Rates API error:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('LITEAPI_API_KEY');
  if (!apiKey) {
    console.error('LITEAPI_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'API key not configured', hotels: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'search';

    console.log(`LiteAPI request: action=${action}`);

    if (action === 'search') {
      const destination = url.searchParams.get('destination') || '';
      const locationId = url.searchParams.get('locationId');
      const checkIn = url.searchParams.get('checkIn') || '';
      const checkOut = url.searchParams.get('checkOut') || '';
      const guests = parseInt(url.searchParams.get('guests') || '2');
      const rooms = parseInt(url.searchParams.get('rooms') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      if (!destination && !locationId) {
        return new Response(
          JSON.stringify({ 
            hotels: [], 
            source: 'liteapi',
            message: 'No destination or locationId provided' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let placeId = locationId;
      if (!placeId && destination) {
        placeId = await getPlaceId(apiKey, destination);
      }

      if (!placeId) {
        return new Response(
          JSON.stringify({ 
            hotels: [], 
            source: 'liteapi',
            message: `No location found for "${destination}"` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const hotelData = await getHotelsByPlace(apiKey, placeId, limit);

      if (hotelData.length === 0) {
        return new Response(
          JSON.stringify({ 
            hotels: [], 
            source: 'liteapi',
            message: 'No hotels found in this location' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If dates are provided, enrich with live rates
      if (checkIn && checkOut) {
        const hotelIds = hotelData.map(h => h.id || h.hotelId).filter(Boolean).slice(0, 10);
        const ratesData = await getHotelRates(apiKey, hotelIds, checkIn, checkOut, guests, rooms);

        if (ratesData.length > 0) {
          const hotelsWithRates = ratesData.map((item: any) => {
            const baseHotel = hotelData.find(h => (h.id || h.hotelId) === item.hotelId) || item.hotelData || item;
            return normalizeHotel(baseHotel, item);
          });

          return new Response(
            JSON.stringify({ 
              hotels: hotelsWithRates, 
              source: 'liteapi' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Fallback: return normalized static hotel data (no live rates)
      const hotels = hotelData.map((h: any) => normalizeHotel(h));

      return new Response(
        JSON.stringify({ 
          hotels, 
          source: 'liteapi' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'book') {
      const hotelId = url.searchParams.get('hotelId');
      const checkIn = url.searchParams.get('checkIn') || '';
      const checkOut = url.searchParams.get('checkOut') || '';
      const guests = parseInt(url.searchParams.get('guests') || '2');
      const rooms = parseInt(url.searchParams.get('rooms') || '1');
      const currency = url.searchParams.get('currency') || 'USD';

      if (!hotelId || !checkIn || !checkOut) {
        console.log('Book: Missing required parameters', { hotelId, checkIn, checkOut });
        return new Response(
          JSON.stringify({ error: 'hotelId, checkIn and checkOut are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const bookUrl = `${LITEAPI_BASE_URL}/hotels/book`;
      const requestBody = {
        hotelId,
        checkin: checkIn,
        checkout: checkOut,
        currency,
        occupancies: [
          {
            rooms,
            adults: guests,
            children: [],
          },
        ],
      };

      try {
        console.log('Booking request body:', JSON.stringify(requestBody));

        const response = await fetch(bookUrl, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Booking API error: ${response.status} - ${errorText}`);
          return new Response(
            JSON.stringify({ error: 'Booking link not available' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();

        const primary = data || {};
        const candidate = Array.isArray(primary.data) && primary.data.length > 0
          ? primary.data[0]
          : primary;

        const bookingUrl =
          (typeof primary.paymentUrl === 'string' && primary.paymentUrl) ||
          (typeof primary.deeplink === 'string' && primary.deeplink) ||
          (typeof primary.bookingUrl === 'string' && primary.bookingUrl) ||
          (typeof candidate.paymentUrl === 'string' && candidate.paymentUrl) ||
          (typeof candidate.deeplink === 'string' && candidate.deeplink) ||
          (typeof candidate.bookingUrl === 'string' && candidate.bookingUrl) ||
          null;

        if (!bookingUrl) {
          console.log('Booking API returned no usable URL', JSON.stringify(data).substring(0, 500));
          return new Response(
            JSON.stringify({ error: 'Booking link not available' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Returning bookingUrl from LiteAPI');
        return new Response(
          JSON.stringify({ bookingUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Booking API exception:', error);
        return new Response(
          JSON.stringify({ error: 'Booking link not available' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (action === 'detail') {
      const hotelId = url.searchParams.get('hotelId');
      const checkIn = url.searchParams.get('checkIn') || '';
      const checkOut = url.searchParams.get('checkOut') || '';
      const guests = parseInt(url.searchParams.get('guests') || '2');
      const rooms = parseInt(url.searchParams.get('rooms') || '1');

      if (!hotelId) {
        return new Response(
          JSON.stringify({ error: 'Hotel ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetching hotel detail: hotelId=${hotelId}`);

      // Get hotel static data
      const detailUrl = `${LITEAPI_BASE_URL}/data/hotel?hotelId=${encodeURIComponent(hotelId)}`;
      const detailResponse = await fetch(detailUrl, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey },
      });

      if (!detailResponse.ok) {
        const errorText = await detailResponse.text();
        console.error(`Hotel detail error: ${detailResponse.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: 'Hotel not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const detailData = await detailResponse.json();
      let hotel = normalizeHotel(detailData.data || detailData);

      // Get rates if dates provided
      if (checkIn && checkOut) {
        const ratesData = await getHotelRates(apiKey, [hotelId], checkIn, checkOut, guests, rooms);
        if (ratesData.length > 0) {
          hotel = normalizeHotel(
            ratesData[0].hotelData || detailData.data,
            ratesData[0]
          );
        }
      }

      return new Response(
        JSON.stringify({ hotel, source: 'liteapi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('LiteAPI error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, hotels: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
