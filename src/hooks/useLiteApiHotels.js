// import { useState, useEffect, useMemo, useRef } from 'react';
// import { supabase } from '@/integrations/supabase/client';
// import { allHotels as staticHotels } from '@/data/hotels';
// import { trackAffiliateRedirect, trackBookingClick, trackSearch } from '@/utils/analytics';

// /**
//  * Hook to fetch hotels from LiteAPI via edge function
//  * Falls back to static data if API is unavailable
//  */
// export function useLiteApiSearch({
//   destination,
//   locationId,
//   checkIn,
//   checkOut,
//   guests = 2,
//   rooms = 1,
//   enabled = true
// }) {
//   const [hotels, setHotels] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [source, setSource] = useState('static');

//   const requestKey = useMemo(() => {
//     return JSON.stringify({
//       destination,
//       locationId,
//       checkIn,
//       checkOut,
//       guests,
//       rooms,
//       enabled,
//     });
//   }, [destination, locationId, checkIn, checkOut, guests, rooms, enabled]);

//   useEffect(() => {
//     if (!enabled || (!destination && !locationId)) return;

//     const fetchHotels = async () => {
//       setLoading(true);
//       setError(null);

//       try {
//         const params = new URLSearchParams({
//           action: 'search',
//           guests: guests.toString(),
//           rooms: rooms.toString(),
//         });

//         if (locationId) {
//           params.set('locationId', locationId);
//         } else if (destination) {
//           params.set('destination', destination);
//         }
//         if (checkIn) params.set('checkIn', checkIn);
//         if (checkOut) params.set('checkOut', checkOut);

//         console.log('Fetching LiteAPI hotels:', params.toString());

//         // Track search event
//         trackSearch({
//           destination,
//           check_in: checkIn,
//           check_out: checkOut,
//           guests,
//           rooms,
//         });

//         const res = await fetch(
//           `${import.meta.env.VITE_LITEAPI_BASE}?${params.toString()}`
//         );

//         const data = await res.json();
//         console.log('LiteAPI edge response JSON (search):', {
//           status: res.status,
//           ok: res.ok,
//           data,
//         });

//         if (!res.ok) {
//           throw new Error(data?.error || `LiteAPI HTTP ${res.status}`);
//         }

//         if (Array.isArray(data.hotels) && data.hotels.length > 0) {
//           console.log(`Got ${data.hotels.length} hotels from ${data.source}`);
//           setHotels(data.hotels);
//           setSource(data.source || 'liteapi');
//         } else {
//           throw new Error(data?.message || 'No hotels returned');
//         }
//       } catch (err) {
//         console.error('LiteAPI search error:', err);
//         setError(err.message);
//         setHotels(staticHotels);
//         setSource('static-fallback');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchHotels();
//   }, [requestKey]);

//   return { hotels, loading, error, source };
// }


// /**
//  * Hook to fetch single hotel detail from LiteAPI
//  * Falls back to static data if API is unavailable
//  */
// export function useLiteApiHotelDetail({ hotelId, checkIn, checkOut, guests, rooms, enabled = true }) {
//   const [hotel, setHotel] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [source, setSource] = useState('static');
  
//   // Cache for rich hotel details (images, descriptions) fetched without dates
//   const richHotelCache = useRef(null);

//   useEffect(() => {
//     if (!hotelId) {
//       setLoading(false);
//       return;
//     }

//     // First check if it's a static hotel ID (numeric)
//     const numericId = parseInt(hotelId);
//     const staticHotel = !isNaN(numericId) 
//       ? staticHotels.find(h => h.id === numericId)
//       : null;

//     const fetchHotel = async () => {
//       setLoading(true);
//       setError(null);

//       // If it's a static hotel ID, use static data
//       if (staticHotel) {
//         setHotel(staticHotel);
//         setSource('static');
//         setLoading(false);
//         return;
//       }

//       // Otherwise, try LiteAPI
//       if (!enabled) {
//         setLoading(false);
//         return;
//       }

//       try {
//         const params = new URLSearchParams({
//           action: 'detail',
//           hotelId,
//         });
        
//         if (checkIn) params.set('checkIn', checkIn);
//         if (checkOut) params.set('checkOut', checkOut);
//         if (guests) params.set('guests', guests.toString());
//         if (rooms) params.set('rooms', rooms.toString());

//         console.log('Fetching LiteAPI hotel detail:', params.toString());

//         const response = await fetch(
//           `${import.meta.env.VITE_LITEAPI_BASE}?${params.toString()}`
//         );

//         if (!response.ok) {
//           throw new Error(`API error: ${response.status}`);
//         }

//         const result = await response.json();
        
//         console.log('LiteAPI edge response JSON (detail):', {
//           status: response.status,
//           ok: response.ok,
//           result,
//         });
        
//         if (result.hotel) {
//           console.log(`Got hotel from ${result.source}`);
          
//           let processedHotel = result.hotel;

//           // If this is a rich response (no dates), update cache
//           if (!checkIn) {
//             richHotelCache.current = result.hotel;
//             console.log('📦 Cached rich hotel data with room photos');
//           } 
//           // If this is a live response (with dates) and we have cache, merge it
//           else if (richHotelCache.current) {
//             console.log('🔄 Merging live rates with cached rich content');
//             const rich = richHotelCache.current;
//             const live = result.hotel;
            
//             // Helper: Normalize string for fuzzy matching
//             const normalize = (str) => {
//               if (!str) return '';
//               return str.toLowerCase()
//                 .replace(/[^a-z0-9]/g, '') // Remove special chars
//                 .replace(/\s+/g, '');      // Remove spaces
//             };
            
//             // Helper: Find matching rich room by name similarity
//             const findRichRoom = (liveName) => {
//               if (!liveName || !rich.roomTypes) return null;
              
//               const normalizedLive = normalize(liveName);
              
//               // Try exact match first
//               let match = rich.roomTypes.find(r => 
//                 normalize(r.name) === normalizedLive
//               );
              
//               if (match) return match;
              
//               // Try partial match (contains)
//               match = rich.roomTypes.find(r => {
//                 const normalizedRich = normalize(r.name);
//                 return normalizedRich.includes(normalizedLive) || 
//                       normalizedLive.includes(normalizedRich);
//               });
              
//               return match;
//             };
            
//             processedHotel = {
//               ...live,
//               images: live.images?.length ? live.images : (rich.images || []),
//               description: live.description || rich.description,
//               roomTypes: (live.roomTypes || []).map((liveRoom, idx) => {
//                 // Try to find matching room in rich data
//                 const richRoom = findRichRoom(liveRoom.name);
                
//                 if (richRoom) {
//                   console.log(`✅ Matched "${liveRoom.name}" with cached room data`);
//                   return {
//                     ...liveRoom,
//                     images: liveRoom.images?.length ? liveRoom.images : (richRoom.images || []),
//                     description: liveRoom.description || richRoom.description,
//                     amenities: liveRoom.amenities?.length ? liveRoom.amenities : (richRoom.amenities || []),
//                     maxOccupancy: liveRoom.maxOccupancy || richRoom.maxOccupancy,
//                     size: liveRoom.size || richRoom.size,
//                     bedType: liveRoom.bedType || richRoom.bedType
//                   };
//                 } else {
//                   console.warn(`⚠️ No cached match for "${liveRoom.name}" - using live data only`);
//                   return liveRoom;
//                 }
//               })
//             };
//           }

//           // Right after fetching with dates
//           if (checkIn && result.hotel) {
//             console.log('🔍 LIVE HOTEL DATA:', {
//               roomTypes: result.hotel.roomTypes?.map(r => ({
//                 name: r.name,
//                 hasImages: !!r.images?.length,
//                 hasRates: !!r.rates?.length
//               }))
//             });
            
//             if (richHotelCache.current) {
//               console.log('📦 CACHED HOTEL DATA:', {
//                 roomTypes: richHotelCache.current.roomTypes?.map(r => ({
//                   name: r.name,
//                   hasImages: !!r.images?.length
//                 }))
//               });
//             }
//           }


//           setHotel(processedHotel);
//           setSource(result.source || 'liteapi');  
//         } else if (result.error) {
//           throw new Error(result.error);
//         }
//       } catch (err) {
//         console.error('LiteAPI hotel detail error:', err);
//         setError(err.message);
//         // Keep static hotel if we have it
//         if (staticHotel) {
//           setHotel(staticHotel);
//           setSource('static-fallback');
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchHotel();
//   }, [hotelId, checkIn, checkOut, guests, enabled]);

//   return { hotel, loading, error, source };
// }



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
          // If this is a live response (with dates) and we have cache, merge it
          else if (richHotelDataCache.has(cacheKey)) {
            console.log('🔄 Merging live rates with cached rich content');
            const rich = richHotelDataCache.get(cacheKey);
            const live = result.hotel;
            
            // Helper: Normalize string for fuzzy matching
            const normalize = (str) => {
              if (!str) return '';
              return str.toLowerCase()
                .replace(/[^a-z0-9]/g, '') // Remove special chars
                .replace(/\s+/g, '');      // Remove spaces
            };
            
            // Helper: Find matching rich room by name similarity (Token-based)
            const findRichRoom = (liveName) => {
              if (!liveName || !rich.roomTypes) return null;
              
              const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '');
              const getTokens = (str) => new Set(normalize(str).split(/\s+/).filter(t => t.length > 2));
              
              const liveTokens = getTokens(liveName);
              
              let bestMatch = null;
              let maxScore = 0;

              rich.roomTypes.forEach(richRoom => {
                 const richTokens = getTokens(richRoom.name);
                 let overlap = 0;
                 liveTokens.forEach(token => {
                    if (richTokens.has(token)) overlap++;
                 });
                 
                 // Jaccard Similarity: Intersection / Union
                 const union = new Set([...liveTokens, ...richTokens]).size;
                 const score = union > 0 ? overlap / union : 0;
                 
                 if (score > maxScore) {
                    maxScore = score;
                    bestMatch = richRoom;
                 }
              });

              // Threshold for acceptance (0.3 is lenient but safe for "Standard Room" vs "Room Standard")
              if (maxScore > 0.3) {
                 return bestMatch;
              }
              
              return null;
            };
            
            processedHotel = {
              ...live,
              // Prefer rich hotel-level content
              images: rich.images?.length ? rich.images : (live.images || []),
              description: rich.description || live.description,
              roomTypes: (live.roomTypes || []).map((liveRoom, idx) => {
                // Try to find matching room in rich data
                const richRoom = findRichRoom(liveRoom.name);
                
                if (richRoom) {
                  console.log(`✅ Matched "${liveRoom.name}" with cached room data`);
                  return {
                    ...liveRoom,
                    // OVERRIDE with Rich Content (Name, Images, Desc, Amenities)
                    name: richRoom.name, // Use the nice name
                    images: richRoom.images?.length ? richRoom.images : (liveRoom.images || []),
                    description: richRoom.description || liveRoom.description,
                    amenities: richRoom.amenities?.length ? richRoom.amenities : (liveRoom.amenities || []),
                    // Keep Live Data for Booking
                    maxOccupancy: liveRoom.maxOccupancy || richRoom.maxOccupancy,
                    size: liveRoom.size || richRoom.size,
                    bedType: liveRoom.bedType || richRoom.bedType
                  };
                } else {
                  console.warn(`⚠️ No cached match for "${liveRoom.name}" - using live data only`);
                  return liveRoom;
                }
              })
            };
          } else {
            console.warn('⚠️ No cached data available - fetching rich data first...');
            // Make a separate call to get rich data
            const richParams = new URLSearchParams({
              action: 'detail',
              hotelId,
            });
            
            try {
              const richResponse = await fetch(
                `${import.meta.env.VITE_LITEAPI_BASE}?${richParams.toString()}`
              );
              
              if (richResponse.ok) {
                const richResult = await richResponse.json();
                if (richResult.hotel) {
                  richHotelDataCache.set(cacheKey, richResult.hotel);
                  console.log('📦 Fetched and cached rich hotel data');
                  
                  // Now merge
                  const rich = richResult.hotel;
                  const live = result.hotel;
                  
                  const normalize = (str) => {
                    if (!str) return '';
                    return str.toLowerCase()
                      .replace(/[^a-z0-9]/g, '')
                      .replace(/\s+/g, '');
                  };
                  
                  const findRichRoom = (liveName) => {
                    if (!liveName || !rich.roomTypes) return null;
                    const normalizedLive = normalize(liveName);
                    let match = rich.roomTypes.find(r => normalize(r.name) === normalizedLive);
                    if (match) return match;
                    match = rich.roomTypes.find(r => {
                      const normalizedRich = normalize(r.name);
                      return normalizedRich.includes(normalizedLive) || 
                             normalizedLive.includes(normalizedRich);
                    });
                    return match;
                  };
                  
                  processedHotel = {
                    ...live,
                    images: live.images?.length ? live.images : (rich.images || []),
                    description: live.description || rich.description,
                    roomTypes: (live.roomTypes || []).map(liveRoom => {
                      const richRoom = findRichRoom(liveRoom.name);
                      if (richRoom) {
                        console.log(`✅ Matched "${liveRoom.name}" with fetched room data`);
                        return {
                          ...liveRoom,
                          images: liveRoom.images?.length ? liveRoom.images : (richRoom.images || []),
                          description: liveRoom.description || richRoom.description,
                          amenities: liveRoom.amenities?.length ? liveRoom.amenities : (richRoom.amenities || []),
                          maxOccupancy: liveRoom.maxOccupancy || richRoom.maxOccupancy,
                          size: liveRoom.size || richRoom.size,
                          bedType: liveRoom.bedType || richRoom.bedType
                        };
                      }
                      return liveRoom;
                    })
                  };
                }
              }
            } catch (richErr) {
              console.error('Failed to fetch rich data:', richErr);
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