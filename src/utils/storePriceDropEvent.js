import { supabase } from '@/integrations/supabase/client';

/**
 * Persists a detected price drop event to the database.
 * 
 * @param {Object} signal - The price drop signal object
 * @param {string} signal.hotelId
 * @param {number} signal.previousPrice
 * @param {number} signal.newPrice
 * @param {number} signal.dropPercent
 */
export async function storePriceDropEvent(signal) {
  if (!signal || !signal.hotelId) return;

  const { hotelId, previousPrice, newPrice, dropPercent } = signal;

  try {
    // Prevent duplicates: Check if we already have this specific drop event recorded
    // We check for same hotel_id, previous_price, and new_price
    const { data: existing } = await supabase
      .from('hotel_price_drop_events')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('previous_price', previousPrice)
      .eq('new_price', newPrice)
      .limit(1)
      .maybeSingle();

    if (existing) return;

    // Insert new event
    await supabase.from('hotel_price_drop_events').insert([
      {
        hotel_id: hotelId,
        previous_price: previousPrice,
        new_price: newPrice,
        drop_percent: dropPercent
      }
    ]);
  } catch (err) {
    // Silent failure as per requirements
    // console.error('storePriceDropEvent error:', err);
  }
}
