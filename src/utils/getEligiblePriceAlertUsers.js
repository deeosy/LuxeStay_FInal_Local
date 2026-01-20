import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves user IDs eligible for price drop alerts for a hotel.
 *
 * @param {string} hotelId
 * @returns {Promise<Array<{ userId: string }>>}
 */
export async function getEligiblePriceAlertUsers(hotelId) {
  try {
    if (!hotelId) return [];

    // 1. Users who saved the hotel
    const { data: savedUsers, error: savedError } = await supabase
      .from('user_saved_hotels')
      .select('user_id')
      .eq('hotel_id', hotelId);

    if (savedError || !savedUsers?.length) return [];

    const userIds = savedUsers.map(u => u.user_id);

    // 2. Filter by notification preference
    const { data: eligibleUsers, error: prefError } = await supabase
      .from('user_notification_settings')
      .select('user_id, price_alert_frequency')
      .in('user_id', userIds)
      .eq('price_drop_alerts', true);

    if (prefError || !eligibleUsers?.length) return [];

    return eligibleUsers.map(u => ({ 
      userId: u.user_id,
      frequency: u.price_alert_frequency || 'instant'
    }));

  } catch {
    return []; // silent
  }
}
