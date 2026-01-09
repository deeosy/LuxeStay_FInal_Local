import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { allHotels as staticHotels } from '@/data/hotels';

/**
 * Hook to fetch hotels from LiteAPI via edge function
 * Falls back to static data if API is unavailable
 */
export function useLiteApiSearch({ destination, checkIn, checkOut, guests, enabled = true }) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('static');

  useEffect(() => {
    if (!enabled) {
      setHotels(staticHotels);
      setSource('static');
      return;
    }

    const fetchHotels = async () => {
      // If no destination, show static hotels filtered by any search
      if (!destination) {
        setHotels(staticHotels);
        setSource('static');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          action: 'search',
          destination,
          limit: '20',
        });
        
        if (checkIn) params.set('checkIn', checkIn);
        if (checkOut) params.set('checkOut', checkOut);
        if (guests) params.set('guests', guests.toString());

        console.log('Fetching LiteAPI hotels:', params.toString());

        const { data, error: fnError } = await supabase.functions.invoke('liteapi', {
          body: null,
          headers: {},
        }, { 
          method: 'GET',
        });

        // Use fetch directly since we need GET with query params
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
        
        if (result.hotels && result.hotels.length > 0) {
          console.log(`Got ${result.hotels.length} hotels from ${result.source}`);
          setHotels(result.hotels);
          setSource(result.source || 'liteapi');
        } else {
          // Fallback: filter static hotels by destination
          console.log('No LiteAPI results, falling back to static data');
          const filtered = staticHotels.filter(h => 
            h.location.toLowerCase().includes(destination.toLowerCase()) ||
            h.name.toLowerCase().includes(destination.toLowerCase())
          );
          setHotels(filtered.length > 0 ? filtered : staticHotels);
          setSource('static-fallback');
        }
      } catch (err) {
        console.error('LiteAPI fetch error:', err);
        setError(err.message);
        
        // Fallback to static data on error
        const filtered = destination 
          ? staticHotels.filter(h => 
              h.location.toLowerCase().includes(destination.toLowerCase()) ||
              h.name.toLowerCase().includes(destination.toLowerCase())
            )
          : staticHotels;
        setHotels(filtered.length > 0 ? filtered : staticHotels);
        setSource('static-error');
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [destination, checkIn, checkOut, guests, enabled]);

  return { hotels, loading, error, source };
}

/**
 * Hook to fetch single hotel detail from LiteAPI
 * Falls back to static data if API is unavailable
 */
export function useLiteApiHotelDetail({ hotelId, checkIn, checkOut, guests, enabled = true }) {
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
