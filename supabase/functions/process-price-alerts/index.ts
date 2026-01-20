import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Job Observability State
  let jobRunId: string | null = null;
  let jobStatus = 'running';
  let processedCount = 0;
  let successCount = 0;
  let failureCount = 0;
  let deadCount = 0;
  let skippedCount = 0;

  try {
    // 0. Start Job Run Log
    const { data: jobRunData, error: jobRunError } = await supabase
      .from('price_alert_job_runs')
      .insert({ status: 'running' })
      .select('id')
      .single();

    if (!jobRunError && jobRunData) {
      jobRunId = jobRunData.id;
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const resend = new Resend(resendApiKey);

    // 1. Select pending or retryable failed rows
    const { data: pendingRows, error: fetchError } = await supabase
      .from("user_price_alert_queue")
      .select("*")
      .or("status.eq.pending,and(status.eq.failed,retry_count.lt.3)")
      .lte('scheduled_for', new Date().toISOString())
      .limit(100);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }
    
    if (!pendingRows || pendingRows.length === 0) {
      // Nothing to process - Success
      jobStatus = 'success';
      if (jobRunId) {
        await supabase.from('price_alert_job_runs').update({
          status: 'success',
          finished_at: new Date().toISOString(),
          processed_count: 0
        }).eq('id', jobRunId);
      }

      return new Response(JSON.stringify({ 
        totalUsers: 0, 
        totalAlerts: 0, 
        users: {},
        jobRunId,
        status: 'success'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    processedCount = pendingRows.length;

    // 2. Group alerts by user_id + digest_group ( or fallback to id)
    const groups: Record<string, any[]> = {};

    for (const row of pendingRows) {
      const key = `${row.user_id}:${row.digest_group ?? row.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }


    const successIds: string[] = [];
    const failedAlerts: any[] = [];
    const skippedAlerts: any[] = [];
    const groupKeys = Object.keys(groups);

    // 3. Process each group
    for (const groupKey of groupKeys) {
      const alerts = groups[groupKey];
      const alertIds = alerts.map((a: any) => a.id);

      try {
        // Preference Check
        const { data: settings, error: settingsError } = await supabase
          .from('user_notification_settings')
          .select('price_drop_alerts')
          .eq('user_id', groupKey.split(':')[0])    
          .single();
        
        // If error (not found) or explicitly disabled, skip
        // Note: .single() returns error if no rows found (PGRST116)
        // If settings is null or price_drop_alerts is false, we skip.
        const shouldSkip = settingsError || !settings || settings.price_drop_alerts !== true;

        if (shouldSkip) {
          skippedAlerts.push(...alerts);
          continue;
        }

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(alerts[0].user_id);

        if (userError || !userData?.user?.email) {
          failedAlerts.push(...alerts);
          continue;
        }

        const email = userData.user.email;
        
        // HTML Construction
        const alertsHtml = alerts.map((alert: any) => `
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

        const { error: emailError } = await resend.emails.send({
          from: 'LuxeStay Alerts <onboarding@resend.dev>',
          to: email,
          subject: `Price Drop Alert: ${alerts.length} hotel${alerts.length > 1 ? 's' : ''} on sale!`,
          html: html,
        });

        if (emailError) {
          console.error("Resend Error:", emailError);
          failedAlerts.push(...alerts);
        } else {
          successCount += 1;
          successIds.push(...alertIds);

          // Increment rate limit log
          // Upsert: if row exists, increment count; if not, insert count=1
          // Since we already checked, we can just upsert.
          // Note: Concurrent runs might over-count slightly, which is acceptable.
          await supabase.from('user_email_send_log').upsert({
              user_id: userId,
              sent_date: today,
              count: currentCount + 1,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, sent_date' });
        }

      } catch (err) {
        console.error("Process Error:", err);
        failedAlerts.push(...alerts);
      }
    }

    // 4. Update statuses
    const now = new Date().toISOString();

    // Success Updates
    if (successIds.length > 0) {
      
       // successCount is tracked per email sent
       const successByRetryCount: Record<string, string[]> = {};
       const idToRetryCount: Record<string, number> = {};
       pendingRows.forEach((r: any) => idToRetryCount[r.id] = r.retry_count || 0);

       successIds.forEach(id => {
         const count = idToRetryCount[id];
         if (!successByRetryCount[count]) successByRetryCount[count] = [];
         successByRetryCount[count].push(id);
       });

       for (const countStr in successByRetryCount) {
         const count = parseInt(countStr);
         const ids = successByRetryCount[countStr];
         await supabase
           .from('user_price_alert_queue')
           .update({ 
             status: 'sent', 
             last_attempt_at: now,
           })
           .in('id', ids);
       }
    }

    // Failed Updates
    if (failedAlerts.length > 0) {
       failureCount = failedAlerts.length;
       const failedByRetryCount: Record<string, { ids: string[], newCount: number, isDead: boolean }> = {};
       
       failedAlerts.forEach(alert => {
         const currentCount = alert.retry_count || 0;
         const newCount = currentCount + 1;
         const isDead = newCount >= 3;
         if (isDead) deadCount++;
         
         const key = `${newCount}-${isDead}`;
         
         if (!failedByRetryCount[key]) failedByRetryCount[key] = { ids: [], newCount, isDead };
         failedByRetryCount[key].ids.push(alert.id);
       });

       for (const key in failedByRetryCount) {
         const group = failedByRetryCount[key];
         await supabase
           .from('user_price_alert_queue')
           .update({ 
             status: group.isDead ? 'dead' : 'failed',
             last_attempt_at: now,
             retry_count: group.newCount
           })
           .in('id', group.ids);
       }
    }

    // Skipped Updates
    if (skippedAlerts.length > 0) {
      skippedCount = skippedAlerts.length;
      const skippedByRetryCount: Record<string, string[]> = {};
      
      skippedAlerts.forEach(alert => {
        const count = alert.retry_count || 0;
        if (!skippedByRetryCount[count]) skippedByRetryCount[count] = [];
        skippedByRetryCount[count].push(alert.id);
      });

      for (const countStr in skippedByRetryCount) {
        const count = parseInt(countStr);
        const ids = skippedByRetryCount[countStr];
        await supabase
          .from('user_price_alert_queue')
          .update({
            status: 'skipped',
            last_attempt_at: now,
          })
          .in('id', ids);
      }
    }

    // Determine Final Job Status
    if (failureCount === 0) {
      jobStatus = 'success';
    } else if (successCount > 0) {
      jobStatus = 'partial';
    } else {
      jobStatus = 'failed';
    }

    // Update Job Run
    if (jobRunId) {
      await supabase.from('price_alert_job_runs').update({
        status: jobStatus,
        finished_at: now,
        processed_count: processedCount,
        success_count: successCount,
        failure_count: failureCount,
        dead_count: deadCount,
        skipped_count: skippedCount
      }).eq('id', jobRunId);
    }

    return new Response(JSON.stringify({
      jobRunId,
      status: jobStatus,
      totalGroups: groupKeys.length,
      successCount,
      failureCount,
      deadCount,
      skippedCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    // Log exception to job run
    if (jobRunId) {
       await supabase.from('price_alert_job_runs').update({
         status: 'failed',
         finished_at: new Date().toISOString(),
         error_message: err.message
       }).eq('id', jobRunId);
    }

    // Silent failure response
    return new Response(JSON.stringify({ 
      error: err.message,
      jobRunId,
      status: 'failed'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
