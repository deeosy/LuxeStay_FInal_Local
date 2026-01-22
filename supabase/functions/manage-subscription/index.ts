
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Crypto Helpers
async function verifyToken(token: string, secret: string): Promise<{ userId: string, exp: number } | null> {
  try {
    const [payloadB64, signatureB64] = token.split('.');
    if (!payloadB64 || !signatureB64) return null;

    // Reconstruct message
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToUint8Array(signatureB64),
      encoder.encode(payloadB64)
    );

    if (!verified) return null;

    // Decode payload
    const payloadStr = new TextDecoder().decode(base64UrlToUint8Array(payloadB64));
    const [userId, expStr] = payloadStr.split(':');
    
    if (!userId || !expStr) return null;

    const exp = parseInt(expStr);
    if (Date.now() > exp) return null;

    return { userId, exp };

  } catch (e) {
    console.error("Token verification failed:", e);
    return null;
  }
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action"); // 'unsubscribe_price_alerts' | 'unsubscribe_all'
    const isResubscribe = url.searchParams.get("resubscribe") === "true";

    if (!token || (!action && !isResubscribe)) {
      return new Response("Missing token or action", { status: 400 });
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify Token
    const payload = await verifyToken(token, supabaseServiceKey);
    if (!payload) {
      return new Response("Invalid or expired link.", { 
        status: 403,
        headers: { "Content-Type": "text/html" } 
      });
    }

    const { userId } = payload;

    // Fetch current settings (may not exist)
    const { data: settings, error: fetchError } = await supabase
      .from('user_notification_settings')
      .select('price_drop_alerts, marketing_emails')
      .eq('user_id', userId)
      .maybeSingle();

    let updates: Record<string, any> = {};
    let logAction = '';

    if (isResubscribe) {
      updates.price_drop_alerts = true;
      updates.marketing_emails = true;
      logAction = 'resubscribe';
    } else if (action === 'unsubscribe_price_alerts') {
      updates.price_drop_alerts = false;
      logAction = 'price_alerts';
    } else if (action === 'unsubscribe_all') {
      updates.price_drop_alerts = false;
      updates.marketing_emails = false;
      logAction = 'all';
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError; // real error
    }

    if (!settings) {
      // No row exists — create one with safe defaults
      const defaultValues: Record<string, any> = {
        user_id: userId,
        price_drop_alerts: isResubscribe ? true : false,
        marketing_emails: isResubscribe ? true : (action === 'unsubscribe_all' ? false : true),
        availability_alerts: false,
        deal_alerts: false,
      };

      const { error: insertError } = await supabase
        .from('user_notification_settings')
        .insert(defaultValues);

      if (insertError) throw insertError;
    } else {
      // Row exists — update only the fields we want
      const { error: updateError } = await supabase
        .from('user_notification_settings')
        .update(updates)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }

    // Log to Audit Table
    await supabase.from('email_unsubscribe_events').insert({
        user_id: userId,
        action: logAction,
        source: 'email_link'
    });

    // Success HTML
    const actionText = action === 'unsubscribe_all' ? 'all emails' : 'price alerts';
    const resubscribeUrl = `${url.origin}${url.pathname}?token=${token}&resubscribe=true`;

    let htmlBody = '';
    
    if (isResubscribe) {
       htmlBody = `
          <h1>Subscribed! ✅</h1>
          <p>You have successfully re-subscribed to price alerts and updates.</p>
          <a href="https://luxestayhaven.com" class="btn">Return to LuxeStayHaven</a>
       `;
    } else {
       htmlBody = `
          <h1>Unsubscribed</h1>
          <p>You have successfully unsubscribed from ${actionText}.</p>
          <div style="margin-top: 2rem;">
             <a href="https://luxestayhaven.com" class="btn">Return to Website</a>
             <p style="margin-top: 1rem; font-size: 0.9rem;">
               Mistake? <a href="${resubscribeUrl}" style="color: #666;">Undo and Re-subscribe</a>
             </p>
          </div>
       `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isResubscribe ? 'Subscribed' : 'Unsubscribed'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
            .card { background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); max-width: 420px; text-align: center; }
            h1 { margin-bottom: 1rem; font-size: 1.8rem; color: #1e293b; }
            p { color: #475569; margin-bottom: 2rem; font-size: 1.1rem; line-height: 1.6; }
            .btn { display: inline-block; background: #000; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 8px; font-size: 1rem; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="card">
            ${htmlBody}
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Unsubscribe error:", err);
    return new Response(`Error: ${err.message}`, { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
});
