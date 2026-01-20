import { supabase } from '@/integrations/supabase/client';

/**
 * Detects if a new price is lower than the most recent previous price.
 * 
 * @param {string} hotelId - The ID of the hotel.
 * @param {number} newPrice - The new price to check.
 * @returns {Promise<Object|null>} - Returns a signal object if drop detected, otherwise null.
 */
export async function detectPriceDrop(hotelId, previousPrice, newPrice) {
  try {
    if (!hotelId || !previousPrice || !newPrice) return null;

    if (newPrice < previousPrice) {
      const dropPercent = Math.round(
        ((previousPrice - newPrice) / previousPrice) * 100
      );

      return {
        hotelId,
        previousPrice,
        newPrice,
        dropPercent,
      };
    }

    return null;
  } catch {
    return null; // silent
  }
}

