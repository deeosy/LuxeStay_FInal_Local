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
    amenities: hotel.facilities?.slice(0, 8) || hotel.amenities || ['Wifi', 'Restaurant', 'Concierge'],
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
      ? room.roomAmenities.map(a => a.name).filter(Boolean)
      : [];

    // Store by room ID
    staticRoomMap.set(room.id, {
      images: roomImages,
      amenities: amenities,
      description: room.description,
      size: room.roomSizeSquare,
      bedType: room.bedTypes?.[0]?.bedType,
      roomName: room.roomName, // ✅ ADDED for name matching
    });
    });

    // Helper: Find static room by name similarity (fuzzy matching)
    const findStaticRoomByName = (rateName) => {
    if (!rateName) return null;

    const normalize = (str) => str.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special chars
      .replace(/\s+/g, ''); // Remove spaces

    const normalizedRateName = normalize(rateName);

    // Try exact ID match first
    for (const [id, data] of staticRoomMap.entries()) {
      if (normalize(data.roomName) === normalizedRateName) {
        return { id, ...data };
      }
    }

    // Try partial match (contains)
    for (const [id, data] of staticRoomMap.entries()) {
      const normalizedStaticName = normalize(data.roomName);
      if (normalizedStaticName.includes(normalizedRateName) || 
          normalizedRateName.includes(normalizedStaticName)) {
        return { id, ...data };
      }
    }

    return null;
    };

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
      
    // Fallback to empty object if no match found
    staticData = staticData || {};
      
      return {
        ...room,
        images: staticData.images || [],
        amenities: staticData.amenities || room.amenities || [],
        description: staticData.description || room.description || '',
        maxOccupancy: room.maxOccupancy || room.maxAdults || 2,
        size: staticData.size || room.roomSizeSquare || null,
        bedType: staticData.bedType || room.bedTypes?.[0]?.bedType || null,
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

  const apiKey = Deno.env.get('LITE_API_KEY_PROD');
  if (!apiKey) {
    console.error('LITE_API_KEY_PROD not configured');
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
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const bookUrl = `${LITEAPI_BASE_URL}/hotels/book`;
      
      // Distribute guests across rooms
      const guestsPerRoom = Math.max(1, Math.floor(guests / rooms));
      const remainder = guests % rooms;
      
      const occupancies = Array.from({ length: rooms }, (_, i) => ({
        adults: i < remainder ? guestsPerRoom + 1 : guestsPerRoom,
        children: []
      }));

      const requestBody = {
        hotelId,
        checkin: checkIn,
        checkout: checkOut,
        currency,
        occupancies,
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
            { status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log(
          'Booking raw response:',
          JSON.stringify(data).substring(0, 500),
        );

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
            { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        console.log('Returning bookingUrl from LiteAPI');
        return new Response(
          JSON.stringify({ bookingUrl }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Booking API exception:', error);
        return new Response(
          JSON.stringify({ error: 'Booking link not available' }),
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
