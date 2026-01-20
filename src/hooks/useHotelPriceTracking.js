import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectPriceDrop } from '@/utils/detectPriceDrop';
import { storePriceDropEvent } from '@/utils/storePriceDropEvent';

export function useHotelPriceTracking() {
  const recordPrice = useCallback(async (hotelId, price) => {
    if (!hotelId || !price) return;

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
