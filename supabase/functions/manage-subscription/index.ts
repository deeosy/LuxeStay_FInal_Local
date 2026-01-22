
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

    if (!token || !action) {
      return new Response("Missing parameters", { status: 400 });
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      supabaseServiceKey
    );

    // Verify Token
    const payload = await verifyToken(token, supabaseServiceKey);
    
    if (!payload) {
      return new Response("Invalid or expired link.", { 
        status: 403,
        headers: { "Content-Type": "text/html" } 
      });
    }

    const { userId } = payload;

    // Update DB
    const updates: any = {};
    if (action === 'unsubscribe_price_alerts') {
      updates.price_drop_alerts = false;
    } else if (action === 'unsubscribe_all') {
      updates.price_drop_alerts = false;
      updates.marketing_emails = false;
      updates.price_alert_frequency = 'weekly'; // Downgrade frequency as soft disable
    }

    const { error } = await supabase
      .from('user_notification_settings')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    // Return HTML Success Page
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
            .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
            h1 { margin-bottom: 1rem; font-size: 1.5rem; }
            p { color: #6b7280; margin-bottom: 1.5rem; }
            .btn { display: inline-block; background: #000; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; font-size: 0.875rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Unsubscribed</h1>
            <p>You have successfully unsubscribed from ${action === 'unsubscribe_all' ? 'all emails' : 'price alerts'}.</p>
            <a href="https://luxestayhaven.com" class="btn">Return to LuxeStay</a>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
});
