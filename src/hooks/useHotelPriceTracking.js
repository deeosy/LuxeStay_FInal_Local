import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectPriceDrop } from '@/utils/detectPriceDrop';
import { storePriceDropEvent } from '@/utils/storePriceDropEvent';

export function useHotelPriceTracking() {
  const recordPrice = useCallback(async (hotelId, price) => {
    // Skip if invalid params
    if (!hotelId || !price) return;

    // Skip LiteAPI IDs (alphanumeric strings) if DB expects Integer/UUID
    // This prevents 400 Bad Request errors for "lpb..." IDs
    const isLiteApiId = typeof hotelId === 'string' && !/^[0-9]+$/.test(hotelId) && !/^[0-9a-f]{8}-[0-9a-f]{4}/.test(hotelId);
    if (isLiteApiId) return;

    try {
      // 1. Get the latest price entry for this hotel
      const { data: latestEntry, error: fetchError } = await supabase
        .from('hotel_price_history')
        .select('price')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        // Silent failure
        return;
      }

      // 2. Only insert if price is different or no history exists
      if (!latestEntry || latestEntry.price !== price) {
        const previousPrice = latestEntry?.price ?? null;

        const dropSignal =
          previousPrice ? await detectPriceDrop(hotelId, previousPrice, price) : null;

        if (dropSignal) {
          // Fire and forget - don't await/block
          storePriceDropEvent(dropSignal);
        }

        await supabase.from('hotel_price_history').insert([
          {
            hotel_id: hotelId,
            price,
            currency: 'USD',
            source: 'liteapi',
          },
        ]);
      }
    } catch (err) {
      // Silent failure
    }
  }, []);

  return { recordPrice };
}
