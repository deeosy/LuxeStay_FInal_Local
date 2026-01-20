import { Resend } from 'resend';

/**
 * Processes pending price drop alerts in the queue.
 * Sends emails via Resend and updates status.
 * 
 * @param {Object} supabaseAdmin - Supabase client with Service Role access
 * @returns {Promise<Object>} Summary of processed alerts
 */
export async function processPriceAlertQueue(supabaseAdmin) {
  // Silent failure if no admin client
  if (!supabaseAdmin) {
    return { totalUsers: 0, totalAlerts: 0, users: {} };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    // If no API key, we cannot send emails. 
    // We should probably return or log, but user requested silent failure.
    return { totalUsers: 0, totalAlerts: 0, users: {}, error: 'Missing RESEND_API_KEY' };
  }

  const resend = new Resend(resendApiKey);

  try {
    // 1. Select pending rows or failed rows with < 3 retries
    const { data: pendingRows, error: fetchError } = await supabaseAdmin
      .from('user_price_alert_queue')
      .select('*')
      .or('status.eq.pending,and(status.eq.failed,retry_count.lt.3)')
      .limit(100);

    if (fetchError || !pendingRows || pendingRows.length === 0) {
      return { totalUsers: 0, totalAlerts: 0, users: {} };
    }

    // 2. Group alerts by user_id
    const usersMap = {}; // userId -> [{ alert details, id, retry_count }]

    for (const row of pendingRows) {
      const { user_id, hotel_id, previous_price, new_price, drop_percent, id, retry_count } = row;

      if (!usersMap[user_id]) {
        usersMap[user_id] = [];
      }

      usersMap[user_id].push({
        id,
        hotel_id,
        previous_price,
        new_price,
        drop_percent,
        retry_count: retry_count || 0
      });
    }

    // 3. Process each user
    const successIds = [];
    const failedAlerts = [];
    const userIds = Object.keys(usersMap);

    for (const userId of userIds) {
      const alerts = usersMap[userId];
      const alertIds = alerts.map(a => a.id);

      try {
        // Resolve user email
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (userError || !userData || !userData.user || !userData.user.email) {
          // If user not found, these alerts are dead immediately? Or failed?
          // Let's treat them as failed for now, logic below handles dead-letter.
          failedAlerts.push(...alerts);
          continue;
        }

        const email = userData.user.email;

        // Construct Email HTML
        const alertsHtml = alerts.map(alert => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: #111827;">Hotel #${alert.hotel_id}</h3>
            <p style="margin: 0 0 8px 0; color: #4b5563;">
              Price dropped by <strong style="color: #059669;">${alert.drop_percent}%</strong>
            </p>
            <div style="margin-bottom: 12px;">
              <span style="text-decoration: line-through; color: #9ca3af;">$${alert.previous_price}</span>
              <span style="font-weight: bold; color: #059669; font-size: 1.1em; margin-left: 8px;">$${alert.new_price}</span>
            </div>
            <a href="https://luxestayhaven.com/hotel/${alert.hotel_id}" style="display: inline-block; background-color: #000; color: #fff; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">View Deal</a>
          </div>
        `).join('');

        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #111827;">Price Drop Alert! 📉</h2>
            <p>Good news! Prices have dropped for hotels you are watching.</p>
            ${alertsHtml}
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
              You are receiving this because you enabled price alerts on LuxeStay.
            </p>
          </div>
        `;

        // Send Email
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'LuxeStay Alerts <onboarding@resend.dev>', // later change to 'LuxeStay Alerts <alerts@luxestayhaven.com>'
          to: email,
          subject: `Price Drop Alert: ${alerts.length} hotel${alerts.length > 1 ? 's' : ''} on sale!`,
          html: html,
        });

        if (emailError) {
          console.error('Resend Error:', emailError);
          failedAlerts.push(...alerts);
        } else {
          successIds.push(...alertIds);
        }

      } catch (err) {
        console.error('Process Error for user ' + userId, err);
        failedAlerts.push(...alerts);
      }
    }

    // 4. Update statuses
    const now = new Date().toISOString();

    // Success: Mark sent, increment retry_count
    if (successIds.length > 0) {
      // We can't easily increment individual rows in one batch update if they have different starting counts,
      // but 'pending' rows usually have 0. 'failed' rows might have 1 or 2.
      // For simplicity and correctness, we should iterate or use an RPC.
      // Since we don't have an RPC, let's just set status='sent' and update last_attempt_at. 
      // We'll trust that retry_count doesn't need to be perfectly accurate for *sent* items, 
      // or we accept that we might not increment it for success (requirement says "On each send attempt: Increment retry_count").
      
      // Let's do a best effort update for success rows:
      // Since we don't want to make N calls, let's just set them to sent.
      // Requirement: "On each send attempt: Increment retry_count". 
      // This implies we should increment even on success.
      
      // But wait, if we are doing this in JS, we can just map the updates.
      // But Supabase JS client doesn't support bulk update with different values easily without upsert.
      // And upsert requires all columns.
      
      // Strategy: 
      // 1. For success: status='sent', last_attempt_at=now. We can ignore retry_count increment for success if acceptable, 
      //    OR we assume we need to increment it. Let's increment it.
      //    Actually, we can use a raw SQL query or just loop. 
      //    Given constraints (backend only, silent failure), let's loop updates for correctness or group by current retry_count.
      
      // Grouping success IDs by their current retry_count to batch updates
      const successByRetryCount = {};
      
      // Re-find the retry_count for each successId from pendingRows (or usersMap flattened)
      const idToRetryCount = {};
      pendingRows.forEach(r => idToRetryCount[r.id] = r.retry_count || 0);

      successIds.forEach(id => {
        const count = idToRetryCount[id];
        if (!successByRetryCount[count]) successByRetryCount[count] = [];
        successByRetryCount[count].push(id);
      });

      for (const [count, ids] of Object.entries(successByRetryCount)) {
        await supabaseAdmin
          .from('user_price_alert_queue')
          .update({ 
            status: 'sent', 
            last_attempt_at: now,
            retry_count: parseInt(count) + 1 
          })
          .in('id', ids);
      }
    }

    // Failed: Mark failed or dead, increment retry_count
    if (failedAlerts.length > 0) {
       // failedAlerts is an array of alert objects now (from push(...alerts))
       const failedByRetryCount = {};
       
       failedAlerts.forEach(alert => {
         const currentCount = alert.retry_count || 0;
         const newCount = currentCount + 1;
         const isDead = newCount >= 3;
         const key = `${newCount}-${isDead}`; // Group by new count and dead status
         
         if (!failedByRetryCount[key]) failedByRetryCount[key] = { ids: [], newCount, isDead };
         failedByRetryCount[key].ids.push(alert.id);
       });

       for (const group of Object.values(failedByRetryCount)) {
         await supabaseAdmin
           .from('user_price_alert_queue')
           .update({ 
             status: group.isDead ? 'dead' : 'failed',
             last_attempt_at: now,
             retry_count: group.newCount
           })
           .in('id', group.ids);
       }
    }

    return {
      totalUsers: userIds.length,
      successCount: successIds.length,
      failureCount: failedAlerts.length
    };

  } catch (err) {
    // Silent failure
    return { totalUsers: 0, totalAlerts: 0, users: {}, error: err.message };
  }
}
