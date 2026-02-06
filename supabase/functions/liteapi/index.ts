import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "https://luxestayhaven.com";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, x-client-info, content-type, x-supabase-auth",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}


console.log('Function started');

const LITEAPI_BASE_URL = "https://api.liteapi.travel/v3.0";

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
  // User Update: Stop relying on 'rooms', use 'roomTypes'
  const availableRooms = rates?.roomTypes || [];
  const hasLiveRates = availableRooms.length > 0;

  // 2. Identify the LOWEST PRICE from ALL roomTypes
  let lowestPrice = Infinity;
  let bestBookingUrl = null;
  const normalizedRooms: any[] = [];

  availableRooms.forEach((room: any) => {
    let priceAmount = 0;
    let currency = 'USD';
    let currentBookingUrl = null;

    // Extract price from offerRetailRate or fallback to rates array
    if (room.offerRetailRate?.amount) {
      priceAmount = room.offerRetailRate.amount;
      currency = room.offerRetailRate.currency || 'USD';
    } else if (room.rates && room.rates.length > 0) {
      const firstRate = room.rates[0];
      if (firstRate.retailRate?.total?.amount) {
        priceAmount = firstRate.retailRate.total.amount;
        currency = firstRate.retailRate.total.currency || 'USD';
      } else if (firstRate.retailRate?.amount) {
        priceAmount = firstRate.retailRate.amount;
        currency = firstRate.retailRate.currency || 'USD';
      }
      
      currentBookingUrl = firstRate.booking_url || firstRate.deeplink || firstRate.paymentUrl || firstRate.bookingUrl;
    }

    // Calculate nightly price (LiteAPI usually returns total for stay)
    const nights = rates?.nights || 1;
    const nightlyPrice = priceAmount > 0 ? priceAmount / nights : 0;

    if (nightlyPrice > 0 && nightlyPrice < lowestPrice) {
      lowestPrice = nightlyPrice;
      if (currentBookingUrl) {
        bestBookingUrl = currentBookingUrl;
      }
    }

    // Add to normalized rooms list
    normalizedRooms.push({
      id: room.roomTypeId || room.roomId || room.id,
      name: room.name,
      price: nightlyPrice,
      currency: currency,
      cancellation: !!room.rates?.[0]?.cancellationPolicies,
      board: room.rates?.[0]?.boardType || 'Room Only',
      bookingUrl: currentBookingUrl
    });
  });

  // Fallback if no rates found
  if (lowestPrice === Infinity) {
    lowestPrice = hotel.pricePerNight || 0;
  }

  // 3. PRIORITY URL MAPPING (Crucial for live bookings)
  // If we didn't find a specific rate URL, fall back to hotel-level URLs
  const bookingUrl = 
    bestBookingUrl ||
    hotel.booking_url || 
    hotel.deeplink || 
    hotel.partner_booking_url || 
    null;

  return {
    id: hotel.id || hotel.hotelId,
    liteApiId: hotel.id || hotel.hotelId,
    name: hotel.name || hotel.hotelName || 'Unknown Hotel',
    location: [hotel.city, hotel.country].filter(Boolean).join(', ') || hotel.address || 'Unknown Location',
    city: hotel.city,
    country: hotel.country,
    price: lowestPrice, // Now strictly the cheapest available rate
    currency: "USD",
    bookingUrl, 
    rating: hotel.starRating || hotel.rating || 4.5,
    reviews: hotel.reviewsCount || Math.floor(Math.random() * 500) + 50,
    image: (() => {
      // Priority order for main image
      if (hotel.main_photo) return hotel.main_photo;
      if (hotel.mainPhoto) return hotel.mainPhoto;
      if (hotel.hotelImages?.[0]?.url) return hotel.hotelImages[0].url;
      if (hotel.images?.[0]?.url) return hotel.images[0].url;
      if (typeof hotel.images?.[0] === 'string') return hotel.images[0];
      return '/placeholder.svg';
    })(),
    images: (() => {
      // Extract all image URLs from hotelImages array
      if (hotel.hotelImages && Array.isArray(hotel.hotelImages)) {
        return hotel.hotelImages.map(img => img.urlHd || img.url).filter(Boolean);
      }
      // Fallback to images array if it exists
      if (hotel.images && Array.isArray(hotel.images)) {
        return hotel.images.map(img => {
          if (typeof img === 'string') return img;
          if (img?.url) return img.url;
          return null;
        }).filter(Boolean);
      }
      // Last resort fallback
      return [hotel.main_photo || hotel.mainPhoto].filter(Boolean);
    })(),
    description: hotel.description || `Experience exceptional hospitality at ${hotel.name || 'this hotel'}.`,
    amenities: (() => {
      const facilities = hotel.facilities || hotel.amenities || [];
      
      const normalized = facilities.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.name) return item.name;
        return null;
      }).filter(Boolean);
      
      return normalized.slice(0, 8).length > 0 
        ? normalized.slice(0, 8) 
        : ['Wifi', 'Restaurant', 'Concierge'];
    })(),
    sqft: hotel.roomSize || Math.floor(Math.random() * 500) + 400,
    beds: hotel.bedrooms || 1,
    guests: hotel.maxOccupancy || 2,
    address: hotel.address || '',
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    rawData: { hotel, rates },
    rooms: normalizedRooms, // Expose full room list for white-label UI
roomTypes: (() => {
    // Extract static room data with photos from rawData
    const staticRooms = hotel.rooms || [];
    const staticRoomMap = new Map();

    staticRooms.forEach(room => {
      const roomImages = room.photos && Array.isArray(room.photos)
        ? room.photos.map(photo => photo.hd_url || photo.url).filter(Boolean)
        : [];

      const amenities = room.roomAmenities && Array.isArray(room.roomAmenities)
        ? room.roomAmenities.map(a => {
            // Handle both string and object formats
            if (typeof a === 'string') return a;
            if (a && typeof a === 'object' && a.name) return a.name;
            return null;
          }).filter(Boolean)
        : [];


      // Store by room ID
      staticRoomMap.set(room.id, {
        images: roomImages,
        amenities: amenities,
        description: room.description,
        size: room.roomSizeSquare,
        bedType: room.bedTypes?.[0]?.bedType,
        roomName: room.roomName,
      });
    });

    // ✅ IMPROVED: Better name matching with aggressive trimming
    const findStaticRoomByName = (rateName) => {
      if (!rateName) return null;

      // ✅ AGGRESSIVE TRIM: Remove everything after "with", "-", "TEST", etc.
      const trimmedName = rateName
        .split(' with ')[0]
        .split(' - ')[0]
        .split(' TEST ')[0]
        .split(' featuring ')[0]
        .split(' ideal ')[0]
        .trim();

      const normalize = (str) => str.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');

      const normalizedRateName = normalize(trimmedName);

      // Try exact match first
      for (const [id, data] of staticRoomMap.entries()) {
        if (normalize(data.roomName) === normalizedRateName) {
          console.log(`✅ Exact match: "${rateName}" → "${data.roomName}"`);
          return { id, ...data };
        }
      }

      // ✅ IMPROVED: Partial match with HIGHER threshold (70%)
      let bestMatch = null;
      let bestScore = 0;
      for (const [id, data] of staticRoomMap.entries()) {
        const normalizedStatic = normalize(data.roomName);
        
        // Calculate match score
        const score = normalizedRateName.includes(normalizedStatic) 
          ? normalizedStatic.length / normalizedRateName.length 
          : 0;
        
        // Only accept matches above 70% confidence (increased from 60%)
        if (score > bestScore && score > 0.7) {
          bestScore = score;
          bestMatch = { id, ...data };
        }
      }
      
      if (bestMatch) {
        console.log(`✅ Partial match (${Math.round(bestScore * 100)}%): "${rateName}" → "${bestMatch.roomName}"`);
      } else {
        console.log(`⚠️ No match found for: "${rateName}"`);
      }
      
      return bestMatch;
    };

    // ✅ NEW: Prepare hotel-level fallbacks
    const fallbackImages = (() => {
      // Get a subset of hotel images (3-5 random images)
      const allImages = hotel.hotelImages?.map(img => img.urlHd || img.url).filter(Boolean) || 
                        hotel.images || [];
      if (allImages.length <= 5) return allImages;
      
      // Randomly select 5 images for variety
      const shuffled = [...allImages].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 5);
    })();
    
const fallbackAmenities = (() => {
  const facilities = hotel.facilities || hotel.amenities || [];
  
  // Normalize to strings only
  const normalized = facilities.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && item.name) return item.name;
    return null;
  }).filter(Boolean);
  
  return normalized.slice(0, 8).length > 0 
    ? normalized.slice(0, 8) 
    : ['Wifi', 'Restaurant', 'Concierge'];
})();
    const fallbackDescription = hotel.description || '';

    // If we have live rates, merge with static room data
    if (availableRooms && availableRooms.length > 0) {
      return availableRooms.map(room => {
        // Try multiple matching strategies
        let staticData = staticRoomMap.get(room.roomTypeId || room.id);
        
        // If no match by ID, try matching by name
        if (!staticData && room.name) {
          const match = findStaticRoomByName(room.name);
          if (match) {
            staticData = match;
          }
        }
        
        // ✅ IMPROVED: Always have fallback, never empty
        const hasStaticData = staticData && Object.keys(staticData).length > 0;

        // ✅ CRITICAL FIX: Enrich rates with offerId and context
        const enrichedRates = (room.rates || []).map(rate => {
          // ✅ IMPORTANT: offerId comes from the ROOM level, not rate level
          const offerId = room.offerId || rate.offerId || `${room.roomTypeId || room.id}_${rate.rateId || Math.random()}`;
          
          return {
            ...rate,
            offerId: offerId,
            roomTypeId: room.roomTypeId || room.id,
            roomName: room.name || staticData?.roomName || rate.name || 'Room',  // Multiple fallbacks
            mappedRoomId: room.mappedRoomId || room.roomTypeId || staticData?.id || room.id,
          };
        });
        
        return {
          ...room,
          // ✅ FIXED: Always provide images (prefer static, fallback to hotel subset)
          images: (hasStaticData && staticData.images?.length > 0) 
            ? staticData.images 
            : fallbackImages,
          
          // ✅ FIXED: Always provide amenities
          amenities: (hasStaticData && staticData.amenities?.length > 0) 
            ? staticData.amenities 
            : (room.amenities || fallbackAmenities),
          
          // ✅ FIXED: Always provide description
          description: (hasStaticData && staticData.description) 
            ? staticData.description 
            : (room.description || fallbackDescription),
          
          maxOccupancy: room.maxOccupancy || room.maxAdults || 2,
          size: staticData?.size || room.roomSizeSquare || null,
          bedType: staticData?.bedType || room.bedTypes?.[0]?.bedType || null,
          rates: enrichedRates,
        };
      });
    }

    // Fallback: Return static rooms with empty rates (when no dates selected)
    return staticRooms.map(room => {
      const staticData = staticRoomMap.get(room.id) || {};

      return {
        id: room.id,
        roomTypeId: room.id,
        name: room.roomName,
        description: staticData.description || '',
        images: staticData.images || [],
        amenities: staticData.amenities || [],
        maxOccupancy: room.maxOccupancy || room.maxAdults || 2,
        size: staticData.size || null,
        bedType: staticData.bedType || null,
        rates: [],
      };
    });
})(),
    priceSource: hasLiveRates ? "liteapi-live" : "static",
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

    const simple = destination.split(",")[0].trim();
    if (simple && simple !== destination) {
      console.log(`Retrying places lookup with simplified destination "${simple}"`);
      const simpleCacheKey = `place:${simple.toLowerCase()}`;
      const simpleCached = getCached<string>(simpleCacheKey);
      if (simpleCached) return simpleCached;

      const simpleUrl =
        `${LITEAPI_BASE_URL}/data/places?textQuery=${encodeURIComponent(simple)}&type=locality`;
      console.log(`Fetching places (simplified): ${simpleUrl}`);

      const simpleResponse = await fetch(simpleUrl, {
        method: "GET",
        headers: { "X-API-Key": apiKey },
      });

      if (!simpleResponse.ok) {
        const simpleErrorText = await simpleResponse.text();
        console.error(
          `Places API error (simplified): ${simpleResponse.status} - ${simpleErrorText}`,
        );
      } else {
        const simpleData = await simpleResponse.json();
        console.log(
          `Places response (simplified):`,
          JSON.stringify(simpleData).substring(0, 500),
        );
        const simplePlace = simpleData.data?.[0];
        if (simplePlace?.placeId) {
          console.log(`Found placeId: ${simplePlace.placeId} for "${simple}"`);
          setCache(simpleCacheKey, simplePlace.placeId, PLACE_CACHE_TTL);
          return simplePlace.placeId;
        }
        console.log(`No placeId found for simplified destination "${simple}"`);
      }
    }

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
    console.log(
      'Hotels by place raw response:',
      JSON.stringify(data).substring(0, 500),
    );
    console.log(`Got ${data.data?.length || 0} hotels from placeId search`);
    const hotels = data.data || [];
    setCache(cacheKey, hotels, HOTEL_CACHE_TTL);
    return hotels;
  } catch (error) {
    console.error('Hotels by place error:', error);
    return [];
  }
}

// Get hotels by city name using data/hotels endpoint (with caching)
async function getHotelsByCity(
  apiKey: string,
  city: string,
  limit: number,
): Promise<any[]> {
  const normalizedCity = city.toLowerCase().trim();
  const cacheKey = `hotels-city:${normalizedCity}:${limit}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const hotelsUrl =
      `${LITEAPI_BASE_URL}/data/hotels?city=${encodeURIComponent(city)}&limit=${limit}`;
    console.log(`Fetching hotels by city: ${hotelsUrl}`);

    const response = await fetch(hotelsUrl, {
      method: "GET",
      headers: { "X-API-Key": apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hotels by city API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    console.log(
      "Hotels by city raw response:",
      JSON.stringify(data).substring(0, 500),
    );
    console.log(`Got ${data.data?.length || 0} hotels from city search`);

    const hotels = data.data || [];
    setCache(cacheKey, hotels, HOTEL_CACHE_TTL);
    return hotels;
  } catch (error) {
    console.error("Hotels by city error:", error);
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
    // Distribute guests across rooms (simple distribution)
    const guestsPerRoom = Math.max(1, Math.floor(guests / rooms));
    const remainder = guests % rooms;
    
    const occupancies = Array.from({ length: rooms }, (_, i) => ({
      adults: i < remainder ? guestsPerRoom + 1 : guestsPerRoom,
      children: []
    }));

    const requestBody = {
      checkin: checkIn,
      checkout: checkOut,
      currency: 'USD',
      guestNationality: 'US',
      occupancies: occupancies,
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
    console.log(
      'Rates raw response:',
      JSON.stringify(data).substring(0, 500),
    );
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
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: getCorsHeaders(req),
    });
  }

  const apiKey = Deno.env.get('LITE_API_KEY') 
  // || Deno.env.get('LITE_API_KEY_PROD');   change this to prod key when ready
  if (!apiKey) {
    console.error('LITE_API_KEY || LITE_API_KEY_PROD not configured');
    return new Response(
      JSON.stringify({ error: 'API key not configured', hotels: [] }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
  console.log('API key loaded successfully (first 10 chars):', apiKey.substring(0, 10));

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'search';

    console.log(`LiteAPI request: action=${action}`);

    if (action === "search") {
      const destination = url.searchParams.get("destination") || "";
      const locationId = url.searchParams.get("locationId");
      const checkIn = url.searchParams.get("checkIn") || "";
      const checkOut = url.searchParams.get("checkOut") || "";
      const guests = parseInt(url.searchParams.get("guests") || "2");
      const rooms = parseInt(url.searchParams.get("rooms") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      if (!destination && !locationId) {
        return new Response(
          JSON.stringify({
            hotels: [],
            source: "liteapi",
            message: "No destination or locationId provided",
          }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      let hotelData: any[] = [];

      let placeId = locationId;
      if (!placeId && destination) {
        placeId = await getPlaceId(apiKey, destination);
      }

      if (placeId) {
        hotelData = await getHotelsByPlace(apiKey, placeId, limit);
      } else if (destination) {
        const simpleCity = destination.split(",")[0].trim() || destination;
        console.log(
          `No placeId resolved, falling back to city search for "${simpleCity}"`,
        );
        hotelData = await getHotelsByCity(apiKey, simpleCity, limit);
      }

      if (hotelData.length === 0) {
        return new Response(
          JSON.stringify({
            hotels: [],
            source: "liteapi",
            message: `No location found for "${destination}"`,
          }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      // If dates are provided, enrich with live rates

      // if (checkIn && checkOut) {
      //   const hotelIds = hotelData.map(h => h.id || h.hotelId).filter(Boolean).slice(0, 10);
      //   const ratesData = await getHotelRates(apiKey, hotelIds, checkIn, checkOut, guests, rooms);

      //   // --- OBSERVABILITY START ---
      //   if (ratesData.length > 0) {
      //     console.log('\n--- LITEAPI PRICING INSPECTION ---');
      //     const sample = ratesData[0];
      //     console.log(`Hotel ID: ${sample.hotelId}`);
      //     console.log(`Has 'rooms' array? ${!!sample.rooms} (Length: ${sample.rooms?.length || 0})`);
      //     console.log(`Has 'roomTypes' array? ${!!sample.roomTypes} (Length: ${sample.roomTypes?.length || 0})`);
          
      //     const roomSource = sample.roomTypes || sample.rooms || [];
      //     roomSource.slice(0, 3).forEach((room: any, idx: number) => {
      //       console.log(`\n[Room #${idx + 1}] ID: ${room.roomTypeId || room.roomId || 'N/A'}`);
      //       console.log(`  Name: ${room.name || 'N/A'}`);
      //       console.log(`  Rates count: ${room.rates?.length || 0}`);
            
      //       if (room.rates?.length > 0) {
      //         const r = room.rates[0];
      //         console.log(`  Rate #1 fields:`);
      //         console.log(`    - net: ${JSON.stringify(r.net || 'missing')}`);
      //         console.log(`    - retailRate: ${JSON.stringify(r.retailRate || 'missing')}`);
      //         console.log(`    - currency: ${r.currency || 'missing'}`);
      //         console.log(`    - cancellation: ${!!r.cancellationPolicies}`);
      //         console.log(`    - boardType: ${r.boardType || 'missing'}`);
      //       }
      //     });
      //     console.log('--- INSPECTION END ---\n');
      //   }
      //   // --- OBSERVABILITY END ---

      //   if (ratesData.length > 0) {
      //     console.log(`Enriching ${ratesData.length} hotels with live rates`);
      //     const hotelsWithRates = ratesData.map((item: any) => {
      //       const baseHotel = hotelData.find(h => (h.id || h.hotelId) === item.hotelId) || item.hotelData || item;
      //       return normalizeHotel(baseHotel, item);
      //     });

      //     return new Response(
      //       JSON.stringify({ 
      //         hotels: hotelsWithRates, 
      //         source: 'liteapi-live' 
      //       }),
      //       { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      //     );
      //   } else {
      //     console.log('Live rates fetch returned no data, falling back to static');
      //   }
      // }

      if (checkIn && checkOut) {
        const hotelIds = hotelData.map(h => h.id || h.hotelId).filter(Boolean).slice(0, 10);

        // ✅ ADDED: Fetch full hotel details with room photos
        const fullHotelDataPromises = hotelIds.map(async (hotelId) => {
          try {
            const detailUrl = `${LITEAPI_BASE_URL}/data/hotel?hotelId=${encodeURIComponent(hotelId)}`;
            const response = await fetch(detailUrl, {
              method: 'GET',
              headers: { 'X-API-Key': apiKey },
            });
            
            if (response.ok) {
              const data = await response.json();
              return data.data || data;
            }
            return null;
          } catch (error) {
            console.error(`Error fetching details for hotel ${hotelId}:`, error);
            return null;
          }
        });

        const fullHotelDataArray = await Promise.all(fullHotelDataPromises);
        const fullHotelDataMap = new Map();
        fullHotelDataArray.forEach(hotel => {
          if (hotel?.id) {
            fullHotelDataMap.set(hotel.id, hotel);
          }
        });

        // Get live rates
        const ratesData = await getHotelRates(apiKey, hotelIds, checkIn, checkOut, guests, rooms);

        if (ratesData.length > 0) {
          console.log(`Enriching ${ratesData.length} hotels with live rates AND full details`);
          const hotelsWithRates = ratesData.map((item: any) => {
            // ✅ CHANGED: Use full hotel data (with rooms/photos) instead of basic list data
            const fullHotel = fullHotelDataMap.get(item.hotelId);
            const baseHotel = fullHotel || hotelData.find(h => (h.id || h.hotelId) === item.hotelId) || item.hotelData || item;
            
            return normalizeHotel(baseHotel, item);
          });

          return new Response(
            JSON.stringify({ 
              hotels: hotelsWithRates, 
              source: 'liteapi-live' 
            }),
            { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        } else {
          console.log('Live rates fetch returned no data, falling back to static');
        }
      }

      // Fallback: return normalized static hotel data (no live rates)
      const hotels = hotelData.map((h: any) => normalizeHotel(h));

      return new Response(
        JSON.stringify({ 
          hotels, 
          source: 'liteapi-static' 
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    } else if (action === 'book') {
      // ────────────────────────────────────────────────
      // Booking Step (Finalization)
      // Endpoint: POST https://book.liteapi.travel/v3.0/rates/book
      // ────────────────────────────────────────────────

      let body: any = {};
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const { prebookId, holder, payment, guests } = body;

      if (!prebookId || !holder || !payment || !guests) {
        console.log('Book: Missing required fields', { prebookId, holder: !!holder, payment: !!payment, guests: !!guests });
        return new Response(
          JSON.stringify({ error: 'Missing required fields: prebookId, holder, payment, guests' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const bookUrl = `https://book.liteapi.travel/v3.0/rates/book`;
      
      const requestBody = {
        prebookId,
        holder,
        payment,
        guests
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

        const rawText = await response.text();
        let json: any = {};
        try {
          json = JSON.parse(rawText);
        } catch {
          json = { raw: rawText };
        }

        if (!response.ok) {
          console.error(`Booking API error: ${response.status} - ${rawText}`);
          return new Response(
            JSON.stringify({ error: json?.error?.message || 'Booking failed' }),
            { status: response.status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        console.log(
          'Booking raw response:',
          JSON.stringify(json).substring(0, 500),
        );

        const bookingId = json.bookingId || json.data?.bookingId;
        const confirmationCode = json.confirmationCode || json.data?.confirmationCode;
        const status = json.status || json.data?.status;

        return new Response(
          JSON.stringify({ bookingId, confirmationCode, status, raw: json }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Booking API exception:', error);
        return new Response(
          JSON.stringify({ error: 'Booking failed due to server error' }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
    } else if (action === 'prebook') {
      // ✅ Read from POST body (not query params)
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        console.error('❌ PREBOOK: Failed to parse JSON body', error);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body for prebook' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const { offerId, usePaymentSdk } = body;

        // ✅ LOG: Received parameters
  console.log('📥 PREBOOK REQUEST RECEIVED');
  console.log('  offerId:', offerId);
  console.log('  usePaymentSdk:', usePaymentSdk);
  console.log('  Full body:', JSON.stringify(body));

      // ✅ Validate required fields
      if (!offerId || usePaymentSdk === undefined) {
            console.error('❌ PREBOOK: Missing required fields', { offerId: !!offerId, usePaymentSdk });
        return new Response(
          JSON.stringify({ error: 'offerId and usePaymentSdk are required' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const prebookUrl = `https://book.liteapi.travel/v3.0/rates/prebook`;

      // ✅ Build payload with required fields
      const bodyPayload = {
        offerId,
        usePaymentSdk,
      };

      try {
            console.log('🚀 PREBOOK: Sending to LiteAPI');
    console.log('  URL:', prebookUrl);
    console.log('  Payload:', JSON.stringify(bodyPayload));
    console.log('  API Key (first 10 chars):', apiKey.substring(0, 10));
        console.log('Prebook request body:', JSON.stringify(bodyPayload));

        const response = await fetch(prebookUrl, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });

            console.log('📡 PREBOOK: LiteAPI Response Status:', response.status);
    console.log('📡 PREBOOK: Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));


        const rawText = await response.text();
            console.log('📡 PREBOOK: Raw Response Text:', rawText.substring(0, 1000)); // First 1000 chars
        let json: any = {};
        try {
          json = JSON.parse(rawText);
          console.log('✅ PREBOOK: Successfully parsed JSON response');
        } catch (parseError){
                console.error('❌ PREBOOK: Failed to parse JSON response', parseError);
          json = { raw: rawText };

        }

        if (!response.ok) {
                console.error('❌ PREBOOK API ERROR');
      console.error('  Status:', response.status);
      console.error('  Error Message:', json?.error?.message || json?.message);
      console.error('  Error Details:', JSON.stringify(json?.error || json));
      console.error('  Full Response:', JSON.stringify(json).substring(0, 500));
      
      // Special logging for 400 errors (invalid offerId)
      if (response.status === 400) {
        console.error('⚠️  PREBOOK: 400 Bad Request - Possible causes:');
        console.error('    - Invalid or expired offerId');
        console.error('    - offerId format incorrect');
        console.error('    - Missing required fields');
        console.error('    - API key not sandbox-enabled');
      }
          return new Response(
            JSON.stringify({ 
              error: json?.error?.message || json?.message || 'Prebook failed',
              details: json?.error || json,
              status: response.status
            }),
            { status: response.status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

            console.log('✅ PREBOOK: Success! Processing response...');

        console.log('Prebook raw response:', JSON.stringify(json).substring(0, 500));

        // ✅ Extract response fields (LiteAPI wraps in 'data' object)
        const prebookId = json.prebookId || json.data?.prebookId;
        const transactionId = json.transactionId || json.data?.transactionId;
        const secretKey = json.secretKey || json.data?.secretKey;
        const pricing = json.pricing || json.data?.pricing;
        const cancellation = json.cancellation || json.data?.cancellation;

        console.log('📤 PREBOOK: Extracted Response Data');
    console.log('  prebookId:', prebookId);
    console.log('  transactionId:', transactionId);
    console.log('  secretKey:', secretKey ? 'Present (hidden)' : 'Missing');
    console.log('  pricing:', pricing ? JSON.stringify(pricing) : 'Not provided');
    console.log('  cancellation:', cancellation ? JSON.stringify(cancellation) : 'Not provided');

    // Validate critical fields
    if (!prebookId || !transactionId || !secretKey) {
      console.error('❌ PREBOOK: Missing critical fields in response');
      console.error('  prebookId:', prebookId ? 'Present' : 'MISSING');
      console.error('  transactionId:', transactionId ? 'Present' : 'MISSING');
      console.error('  secretKey:', secretKey ? 'Present' : 'MISSING');
    }

    return new Response(
      JSON.stringify({ prebookId, transactionId, secretKey, pricing, cancellation }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ PREBOOK: Exception during fetch');
    console.error('  Error:', error);
    console.error('  Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('  Error stack:', error instanceof Error ? error.stack : 'N/A');
    
    return new Response(
      JSON.stringify({ 
        error: 'Prebook failed due to network or server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
      }
  }  else if (action === 'confirm') {
      const prebookId = url.searchParams.get('prebookId');
      const transactionId = url.searchParams.get('transactionId');
      if (!prebookId || !transactionId) {
        return new Response(
          JSON.stringify({ error: 'prebookId and transactionId are required' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        body = {};
      }
      const bookUrl = `https://book.liteapi.travel/v3.0/rates/book`;
      try {
        const response = await fetch(bookUrl, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prebookId,
            transactionId,
            guest: body.guest || {},
          }),
        });
        const rawText = await response.text();
        let json: any = {};
        try {
          json = JSON.parse(rawText);
        } catch (_) {
          json = { raw: rawText };
        }
        if (!response.ok) {
          return new Response(
            JSON.stringify({ error: json?.error?.message || 'Booking failed' }),
            { status: response.status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }
        const bookingId = json.bookingId || json.data?.bookingId;
        const confirmationCode = json.confirmationCode || json.data?.confirmationCode;
        const summary = json.summary || json.data?.summary || json;
        return new Response(
          JSON.stringify({ bookingId, confirmationCode, summary }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Booking failed' }),
          { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
          { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const detailData = await detailResponse.json();
      let hotel = normalizeHotel(detailData.data || detailData);

      // Get rates if dates provided
      if (checkIn && checkOut) {
        const ratesData = await getHotelRates(apiKey, [hotelId], checkIn, checkOut, guests, rooms);
        if (ratesData.length > 0) {
          // --- DETAIL OBSERVABILITY START ---
          const result = ratesData[0];
          console.log('\n--- LITEAPI DETAIL RATES INSPECTION ---');
          console.log(`Has 'rooms' array? ${!!result.rooms}`);
          console.log(`Has 'roomTypes' array? ${!!result.roomTypes}`);

          if (result.roomTypes) {
            console.log(`Source: roomTypes (Count: ${result.roomTypes.length})`);
            const firstRoom = result.roomTypes[0];
            console.log(`[First RoomType] ID: ${firstRoom.roomTypeId || firstRoom.id}`);
            console.log(`  Name: ${firstRoom.name}`);
            console.log(`  Rates count: ${firstRoom.rates?.length || 0}`);
            
            if (firstRoom.rates?.length > 0) {
              const r = firstRoom.rates[0];
              console.log(`  Rate #1 fields:`);
              console.log(`    - net: ${JSON.stringify(r.net || 'missing')}`);
              console.log(`    - retail: ${JSON.stringify(r.retail || r.retailRate || 'missing')}`);
              console.log(`    - currency: ${r.currency || 'missing'}`);
              console.log(`    - boardType: ${r.boardType || 'missing'}`);
              console.log(`    - cancellation: ${!!r.cancellationPolicies}`);
            }
          } else if (result.rooms) {
            console.log(`Source: rooms (Count: ${result.rooms.length})`);
            const firstRoom = result.rooms[0];
            console.log(`[First Room] ID: ${firstRoom.roomId || firstRoom.id}`);
            console.log(`  Name: ${firstRoom.name}`);
            console.log(`  Rates count: ${firstRoom.rates?.length || 0}`);
            
            if (firstRoom.rates?.length > 0) {
              const r = firstRoom.rates[0];
              console.log(`  Rate #1 fields:`);
              console.log(`    - net: ${JSON.stringify(r.net || 'missing')}`);
              console.log(`    - retail: ${JSON.stringify(r.retail || r.retailRate || 'missing')}`);
              console.log(`    - currency: ${r.currency || 'missing'}`);
              console.log(`    - boardType: ${r.boardType || 'missing'}`);
              console.log(`    - cancellation: ${!!r.cancellationPolicies}`);
            }
          }
          console.log('--- DETAIL INSPECTION END ---\n');
          // --- DETAIL OBSERVABILITY END ---

          hotel = normalizeHotel(
            ratesData[0].hotelData || detailData.data,
            ratesData[0]
          );
        }
      }

      return new Response(
        JSON.stringify({ hotel, source: 'liteapi' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('LiteAPI error:', errorMessage);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'search';

    const status = action === 'book' ? 500 : 200;
    const payload =
      action === 'search'
        ? { error: errorMessage, hotels: [], source: 'liteapi-fallback' }
        : { error: errorMessage };

    return new Response(
      JSON.stringify(payload),
      { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});