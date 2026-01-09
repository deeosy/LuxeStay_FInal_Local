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
  const firstRate = rates?.rooms?.[0]?.rates?.[0];
  const price = firstRate?.retailRate?.total?.amount 
    ? Math.round(firstRate.retailRate.total.amount / (rates?.nights || 1))
    : hotel.pricePerNight || 0;

  return {
    id: hotel.id || hotel.hotelId,
    liteApiId: hotel.id || hotel.hotelId,
    name: hotel.name || hotel.hotelName || 'Unknown Hotel',
    location: [hotel.city, hotel.country].filter(Boolean).join(', ') || hotel.address || 'Unknown Location',
    price: price,
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
    rawData: hotel,
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
  guests: number
): Promise<any[]> {
  const cacheKey = `rates:${hotelIds.sort().join(',')}:${checkIn}:${checkOut}:${guests}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const ratesUrl = `${LITEAPI_BASE_URL}/hotels/rates`;
    const requestBody = {
      checkin: checkIn,
      checkout: checkOut,
      currency: 'USD',
      guestNationality: 'US',
      occupancies: [{ rooms: 1, adults: guests, children: [] }],
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
      const checkIn = url.searchParams.get('checkIn') || '';
      const checkOut = url.searchParams.get('checkOut') || '';
      const guests = parseInt(url.searchParams.get('guests') || '2');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      if (!destination) {
        console.log('Search: No destination provided');
        return new Response(
          JSON.stringify({ hotels: [], message: 'No destination provided' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Searching: destination="${destination}", checkIn=${checkIn}, checkOut=${checkOut}, guests=${guests}`);

      // Step 1: Get placeId from destination name
      const placeId = await getPlaceId(apiKey, destination);
      
      if (!placeId) {
        console.log(`No placeId found for "${destination}", returning empty`);
        return new Response(
          JSON.stringify({ hotels: [], message: `No results for "${destination}"` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 2: Get hotels by placeId
      const hotelData = await getHotelsByPlace(apiKey, placeId, limit);
      
      if (hotelData.length === 0) {
        console.log('No hotels found for placeId');
        return new Response(
          JSON.stringify({ hotels: [], message: 'No hotels available' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 3: If dates provided, get rates for hotels
      if (checkIn && checkOut) {
        const hotelIds = hotelData.map(h => h.id || h.hotelId).filter(Boolean).slice(0, 10);
        const ratesData = await getHotelRates(apiKey, hotelIds, checkIn, checkOut, guests);
        
        if (ratesData.length > 0) {
          const hotelsWithRates = ratesData.map((item: any) => {
            const hotel = item.hotelData || hotelData.find(h => (h.id || h.hotelId) === item.hotelId) || item;
            return normalizeHotel(hotel, { rooms: item.rooms, nights: item.nights });
          });
          
          console.log(`Returning ${hotelsWithRates.length} hotels with rates`);
          return new Response(
            JSON.stringify({ hotels: hotelsWithRates, source: 'liteapi' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Return hotels without rates (static data)
      const hotels = hotelData.map((h: any) => normalizeHotel(h));
      console.log(`Returning ${hotels.length} hotels (no rates)`);
      
      return new Response(
        JSON.stringify({ hotels, source: 'liteapi' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'detail') {
      const hotelId = url.searchParams.get('hotelId');
      const checkIn = url.searchParams.get('checkIn') || '';
      const checkOut = url.searchParams.get('checkOut') || '';
      const guests = parseInt(url.searchParams.get('guests') || '2');

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
        const ratesData = await getHotelRates(apiKey, [hotelId], checkIn, checkOut, guests);
        if (ratesData.length > 0) {
          hotel = normalizeHotel(
            ratesData[0].hotelData || detailData.data,
            { rooms: ratesData[0].rooms, nights: ratesData[0].nights }
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
