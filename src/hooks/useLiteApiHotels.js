import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { allHotels as staticHotels } from '@/data/hotels';
import { trackAffiliateRedirect, trackBookingClick, trackSearch } from '@/utils/analytics';

// ✅ MOVED OUTSIDE: Module-level cache that persists across re-renders
const richHotelDataCache = new Map();

/**
 * Hook to fetch hotels from LiteAPI via edge function
 * Falls back to static data if API is unavailable
 */
export function useLiteApiSearch({
  destination,
  locationId,
  checkIn,
  checkOut,
  guests = 2,
  rooms = 1,
  enabled = true
}) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('static');

  const requestKey = useMemo(() => {
    return JSON.stringify({
      destination,
      locationId,
      checkIn,
      checkOut,
      guests,
      rooms,
      enabled,
    });
  }, [destination, locationId, checkIn, checkOut, guests, rooms, enabled]);

  useEffect(() => {
    if (!enabled || (!destination && !locationId)) return;

    const fetchHotels = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          action: 'search',
          guests: guests.toString(),
          rooms: rooms.toString(),
        });

        if (locationId) {
          params.set('locationId', locationId);
        } else if (destination) {
          params.set('destination', destination);
        }
        if (checkIn) params.set('checkIn', checkIn);
        if (checkOut) params.set('checkOut', checkOut);

        console.log('Fetching LiteAPI hotels:', params.toString());

        // Track search event
        trackSearch({
          destination,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          rooms,
        });

        const res = await fetch(
          `${import.meta.env.VITE_LITEAPI_BASE}?${params.toString()}`
        );

        const data = await res.json();
        console.log('LiteAPI edge response JSON (search):', {
          status: res.status,
          ok: res.ok,
          data,
        });

        if (!res.ok) {
          throw new Error(data?.error || `LiteAPI HTTP ${res.status}`);
        }

        if (Array.isArray(data.hotels) && data.hotels.length > 0) {
          console.log(`Got ${data.hotels.length} hotels from ${data.source}`);
          setHotels(data.hotels);
          setSource(data.source || 'liteapi');
        } else {
          throw new Error(data?.message || 'No hotels returned');
        }
      } catch (err) {
        console.error('LiteAPI search error:', err);
        setError(err.message);
        setHotels(staticHotels);
        setSource('static-fallback');
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [requestKey]);

  return { hotels, loading, error, source };
}


/**
 * Hook to fetch single hotel detail from LiteAPI
 * Falls back to static data if API is unavailable
 */
export function useLiteApiHotelDetail({ hotelId, checkIn, checkOut, guests, rooms, enabled = true }) {
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('static');

  useEffect(() => {
    if (!hotelId) {
      setLoading(false);
      return;
    }

    // First check if it's a static hotel ID (numeric)
    const numericId = parseInt(hotelId);
    const staticHotel = !isNaN(numericId) 
      ? staticHotels.find(h => h.id === numericId)
      : null;

    const fetchHotel = async () => {
      setLoading(true);
      setError(null);

      // If it's a static hotel ID, use static data
      if (staticHotel) {
        setHotel(staticHotel);
        setSource('static');
        setLoading(false);
        return;
      }

      // Otherwise, try LiteAPI
      if (!enabled) {
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams({
          action: 'detail',
          hotelId,
        });
        
        if (checkIn) params.set('checkIn', checkIn);
        if (checkOut) params.set('checkOut', checkOut);
        if (guests) params.set('guests', guests.toString());
        if (rooms) params.set('rooms', rooms.toString());

        console.log('Fetching LiteAPI hotel detail:', params.toString());

        const response = await fetch(
          `${import.meta.env.VITE_LITEAPI_BASE}?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        
        console.log('LiteAPI edge response JSON (detail):', {
          status: response.status,
          ok: response.ok,
          result,
        });
        
        if (result.hotel) {
          console.log(`Got hotel from ${result.source}`);
          
          let processedHotel = result.hotel;

          // ✅ FIXED: Use persistent module-level cache
          const cacheKey = hotelId;

          // If this is a rich response (no dates), update cache
          if (!checkIn) {
            richHotelDataCache.set(cacheKey, result.hotel);
            console.log('📦 Cached rich hotel data with room photos');
          } 
          // If this is a live response (with dates), we need to group offers by mappedRoomId
          else {
            const live = result.hotel;
            let groupedRooms = [];

            // Group offers into rooms
            if (live.roomTypes) {
              const roomsMap = new Map();
              
              live.roomTypes.forEach(offer => {
                if (!offer.rates) return;
                
                offer.rates.forEach(rate => {
                  const roomId = rate.mappedRoomId;
                  
                  if (!roomsMap.has(roomId)) {
                    roomsMap.set(roomId, {
                      mappedRoomId: roomId,
                      name: rate.name, // Temporary name from rate
                      rates: []
                    });
                  }
                  
                  const room = roomsMap.get(roomId);
                  // Attach offerId to the rate object for selection
                  room.rates.push({
                    ...rate,
                    offerId: offer.offerId // CRITICAL: Link offerId to the specific rate
                  });
                });
              });
              
              groupedRooms = Array.from(roomsMap.values());
            }

            // Merge with cached rich data if available
            if (richHotelDataCache.has(cacheKey)) {
              console.log('🔄 Merging live rates with cached rich content');
              const rich = richHotelDataCache.get(cacheKey);
              
              processedHotel = {
                ...live,
                images: rich.images?.length ? rich.images : (live.images || []),
                description: rich.description || live.description,
                roomTypes: groupedRooms.map(liveRoom => {
                  // 1. Try exact match by mappedRoomId (most reliable)
                  let richRoom = rich.rooms?.find(r => r.id === liveRoom.mappedRoomId);
                  
                  // 2. Fallback: Try fuzzy name match against rich.roomTypes (legacy structure)
                  if (!richRoom && rich.roomTypes) {
                     const normalize = (str) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
                     const liveNameNorm = normalize(liveRoom.name);
                     richRoom = rich.roomTypes.find(r => normalize(r.name) === liveNameNorm);
                  }

                  if (richRoom) {
                    // Extract images correctly based on structure
                    const richImages = richRoom.photos?.map(p => p.url) || richRoom.images || [];
                    
                    return {
                      ...liveRoom,
                      name: richRoom.roomName || richRoom.name || liveRoom.name,
                      images: richImages.length ? richImages : (liveRoom.images || []),
                      description: richRoom.description || liveRoom.description,
                      amenities: richRoom.amenities || liveRoom.amenities || [],
                      maxOccupancy: richRoom.maxOccupancy || liveRoom.maxOccupancy,
                      size: richRoom.size || liveRoom.size,
                      bedType: richRoom.bedType || liveRoom.bedType
                    };
                  }
                  
                  return liveRoom;
                })
              };
            } else {
              // No rich data cache, just use grouped rooms
              processedHotel = {
                ...live,
                roomTypes: groupedRooms
              };
              
              // Trigger background fetch for rich data to update UI later
              console.warn('⚠️ No cached data available - triggering background fetch...');
              const richParams = new URLSearchParams({ action: 'detail', hotelId });
              fetch(`${import.meta.env.VITE_LITEAPI_BASE}?${richParams.toString()}`)
                .then(r => r.json())
                .then(d => {
                  if (d.hotel) {
                    richHotelDataCache.set(cacheKey, d.hotel);
                    // Force re-render logic could go here, or we wait for next update
                  }
                })
                .catch(e => console.error('Background rich fetch failed', e));
            }
          }

          setHotel(processedHotel);
          setSource(result.source || 'liteapi');
        } else if (result.error) {
          throw new Error(result.error);
        }
      } catch (err) {
        console.error('LiteAPI hotel detail error:', err);
        setError(err.message);
        // Keep static hotel if we have it
        if (staticHotel) {
          setHotel(staticHotel);
          setSource('static-fallback');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHotel();
  }, [hotelId, checkIn, checkOut, guests, rooms, enabled]);

  return { hotel, loading, error, source };
}