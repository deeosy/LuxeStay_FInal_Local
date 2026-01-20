import { supabase } from '@/integrations/supabase/client';

/**
 * Enqueues price drop alerts for eligible users.
 * 
 * @param {Object} payload - The alert payload
 * @param {string} payload.hotelId
 * @param {number} payload.previousPrice
 * @param {number} payload.newPrice
 * @param {number} payload.dropPercent
 * @param {Array<{userId: string}>} payload.users
 */
export async function enqueuePriceDropAlerts(payload) {
  if (!payload || !payload.users || payload.users.length === 0) return;

  const { hotelId, previousPrice, newPrice, dropPercent, users } = payload;

  const rows = users
    .filter(u => u?.userId)
    .map(user => {
      let scheduledFor = new Date();
      let digestGroup = null;
      const freq = user.frequency || 'instant';
      
      if (freq === 'daily') {
        // Next day 00:00 UTC
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + 1);
        d.setUTCHours(0,0,0,0);
        scheduledFor = d;
        digestGroup = `daily_${d.toISOString().split('T')[0]}`;
      } else if (freq === 'weekly') {
        // Next Monday 00:00 UTC
        const d = new Date();
        const day = d.getUTCDay(); // 0=Sun, 1=Mon...
        // Calculate days to add to get to next Monday (1)
        // If today is Monday (1), add 7 days.
        // If today is Sunday (0), add 1 day.
        const daysToAdd = day === 1 ? 7 : (8 - day) % 7 || 7;
        d.setUTCDate(d.getUTCDate() + daysToAdd);
        d.setUTCHours(0,0,0,0);
        scheduledFor = d;
        digestGroup = `weekly_${d.toISOString().split('T')[0]}`;
      }

      return {
        user_id: user.userId,
        hotel_id: hotelId,
        previous_price: previousPrice,
        new_price: newPrice,
        drop_percent: dropPercent,
        status: 'pending',
        digest_group: digestGroup,
        scheduled_for: scheduledFor.toISOString()
      };
    });

  try {
    // Insert rows, ignoring duplicates based on the unique index (user_id, hotel_id, new_price)
    const { error } = await supabase
      .from('user_price_alert_queue')
      .upsert(rows, { 
        onConflict: 'user_id,hotel_id,new_price', 
        ignoreDuplicates: true 
      });
      
    if (error) {
       // Silent failure
       // console.error('enqueuePriceDropAlerts error:', error);
    }
  } catch (err) {
    // Silent failure
  }
}
