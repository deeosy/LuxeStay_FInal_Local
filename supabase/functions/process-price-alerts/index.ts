import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Crypto Helper for Token Generation
async function generateUnsubscribeToken(userId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
  const payloadStr = `${userId}:${exp}`;
  const payloadB64 = uint8ArrayToBase64Url(encoder.encode(payloadStr));

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadB64)
  );
  
  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signature));
  return `${payloadB64}.${signatureB64}`;
}

function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...uint8Array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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
  let emailsSentCount = 0;
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

      const unsubscribeToken = await generateUnsubscribeToken(
        alerts[0].user_id,
        supabaseServiceKey
      );

      const baseUrl = "https://cyopwkfinqpsnnpqmmkb.supabase.co/functions/v1/manage-subscription";

      const unsubAlertsUrl = `${baseUrl}?token=${unsubscribeToken}&action=unsubscribe_price_alerts`;
      const unsubAllUrl = `${baseUrl}?token=${unsubscribeToken}&action=unsubscribe_all`;


      try {
        // Preference Check
        const { data: settings, error: settingsError } = await supabase
          .from('user_notification_settings')
          .select('price_drop_alerts, marketing_emails')
          .eq('user_id', groupKey.split(':')[0])    
          .single();
        
        // 1. Global Unsubscribe Guard
        // If both marketing and price drops are disabled, user is globally unsubscribed.
        if (settings && settings.marketing_emails === false && settings.price_drop_alerts === false) {
          skippedAlerts.push(...alerts);
          continue;
        }

        // 2. Specific Alert Type Guard (Price Drop) & Fail-safe
        // If settings are missing (error/null) OR price_drop_alerts is not true, skip.
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
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;margin-bottom:32px;box-shadow:0 4px 12px rgba(0,0,0,0.04);text-align:left;">
            <!-- Hotel Title -->
            <h3 style="font-size:20px;color:#1e293b;margin:0 0 16px;font-weight:500;">
              Hotel #${alert.hotel_id}
            </h3>

            <!-- Price Drop Highlight -->
            <div style="margin-bottom:24px;">
              <p style="font-size:17px;color:#475569;margin:0;line-height:1.6;">
                Price dropped by 
                <span style="font-size:24px;font-weight:700;color:#059669;">
                  ${alert.drop_percent.toFixed(1)}%
                </span>
              </p>
            </div>

            <!-- Prices -->
            <div style="margin-bottom:32px;">
              <span style="font-size:20px;text-decoration:line-through;color:#94a3b8;">
                $${alert.previous_price}
              </span>
              <span style="font-size:36px;font-weight:700;color:#059669;margin-left:16px;">
                $${alert.new_price}
              </span>
              <span style="font-size:16px;color:#64748b;margin-left:8px;">/night</span>
            </div>

            <!-- CTA Button -->
            <a href="https://luxestayhaven.com/hotel/${alert.hotel_id}"
              style="display:inline-block;padding:16px 40px;background-color:#d49c39;color:#000000;font-size:17px;font-weight:500;text-decoration:none;border-radius:12px;letter-spacing:0.5px;">
              View Deal
            </a>
          </div>
        `).join('');

        const html = `
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9f9f9;padding:40px 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding:40px 20px;background:#3c2c20;">
                    <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:300;letter-spacing:2px;">
                      LuxeStayHaven
                    </h1>
                    <p style="color:#e2e8f0;margin:8px 0 0;font-size:14px;letter-spacing:1px;">
                      Curated Luxury Stays Worldwide
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding:50px 40px;text-align:center;">
                    <h2 style="font-size:26px;color:#1e293b;margin:0 0 20px;font-weight:500;">
                      Price Drop Alert! 📉
                    </h2>
                    <p style="font-size:17px;color:#475569;line-height:1.6;margin:0 0 30px;">
                      Great news — ${alerts.length} luxury hotel${alerts.length > 1 ? 's' : ''} you’re watching just got cheaper.
                    </p>

                    ${alertsHtml}

                    <p style="font-size:15px;color:#64748b;margin:40px 0 30px;line-height:1.6;">
                      Don’t miss out — these rates can change quickly.
                    </p>
                  </td>
                </tr>

                ${generateEmailFooter(unsubAlertsUrl, unsubAllUrl)}

              </table>
            </td>
          </tr>
        </table>
        `;

        const userId = alerts[0].user_id;
        const today = new Date().toISOString().slice(0, 10);

        // Fetch current send count
        const { data: sendLog } = await supabase
          .from('user_email_send_log')
          .select('count')
          .eq('user_id', userId)
          .eq('sent_date', today)
          .maybeSingle();

        const currentCount = sendLog?.count ?? 0;

        // Enforce daily limit (MAX = 3)
        if (currentCount >= 3) {
          skippedAlerts.push(...alerts);
          continue;
        }

        const { error: emailError } = await resend.emails.send({
          from: 'LuxeStay Alerts <alerts@luxestayhaven.com>',
          to: email,
          subject: `Price Drop Alert: ${alerts.length} hotel${alerts.length > 1 ? 's' : ''} on sale!`,
          html: html,
        });

        if (emailError) {
          console.error("Resend Error:", emailError);
          failedAlerts.push(...alerts);
        } else {
          emailsSentCount += 1;
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
      
       // emailsSentCount is tracked per email sent
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
    } else if (emailsSentCount > 0) {
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
        success_count: emailsSentCount,
        failure_count: failureCount,
        dead_count: deadCount,
        skipped_count: skippedCount
      }).eq('id', jobRunId);
    }

    return new Response(JSON.stringify({
      jobRunId,
      status: jobStatus,
      totalGroups: groupKeys.length,
      emailsSentCount,
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

// Reusable Email Footer Helper
function generateEmailFooter(unsubAlertsUrl: string, unsubAllUrl: string): string {
  return `
    <!-- Footer -->
    <tr>
      <td style="padding:30px 40px;background:#f8fafc;text-align:center;">
        <p style="font-size:13px;color:#94a3b8;margin:0;line-height:1.6;">
          © 2026 LuxeStayHaven. All rights reserved.<br>
          Experience the extraordinary.
        </p>
        <p style="font-size:12px;color:#cbd5e1;margin:20px 0 0;">
          You are receiving this because you enabled price drop alerts.<br>
          <a href="${unsubAlertsUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from price alerts</a> 
          &nbsp;|&nbsp; 
          <a href="${unsubAllUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from all emails</a>
        </p>
      </td>
    </tr>
  `;
}
