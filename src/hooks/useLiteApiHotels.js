import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { allHotels as staticHotels } from '@/data/hotels';
import { trackAffiliateRedirect, trackBookingClick, trackSearch } from '@/utils/analytics';

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
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/liteapi?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );

        const data = await res.json();

        if (data.hotels) {
          console.log(`Got ${data.hotels.length} hotels from ${data.source}`);
          setHotels(data.hotels);
          setSource(data.source || 'liteapi');
        } else {
          throw new Error('No hotels returned');
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
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/liteapi?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.hotel) {
          console.log(`Got hotel from ${result.source}`);
          setHotel(result.hotel);
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
  }, [hotelId, checkIn, checkOut, guests, enabled]);

  return { hotel, loading, error, source };
}
