import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-indexnow-admin-token",
};

type IndexNowBody = {
  host: string;
  key: string;
  keyLocation: string;
  sitemap?: string;
  urls?: string[];
};

const INDEXNOW_ENDPOINTS = [
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expectedToken = Deno.env.get("INDEXNOW_ADMIN_TOKEN");
  const providedToken = req.headers.get("x-indexnow-admin-token");
  if (!expectedToken || !providedToken || providedToken !== expectedToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: IndexNowBody;
  try {
    body = await req.json();
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const host = body.host;
  const key = body.key;
  const keyLocation = body.keyLocation;
  const sitemap = body.sitemap;
  const urls = Array.isArray(body.urls) ? body.urls.filter(Boolean) : [];

  if (!host || !key || !keyLocation) {
    return new Response(
      JSON.stringify({ error: "host, key, and keyLocation are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!sitemap && urls.length === 0) {
    return new Response(
      JSON.stringify({ error: "Provide sitemap or urls" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const payload: Record<string, unknown> = {
    host,
    key,
    keyLocation,
    urlList: urls.length > 0 ? urls : undefined,
  };

  const endpointResults = await Promise.all(
    INDEXNOW_ENDPOINTS.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        return {
          endpoint,
          ok: res.ok,
          status: res.status,
          body: text.slice(0, 1000),
        };
      } catch (err) {
        return {
          endpoint,
          ok: false,
          status: 0,
          body: String(err).slice(0, 1000),
        };
      }
    }),
  );

  if (sitemap) {
    const pingResults = await Promise.all(
      INDEXNOW_ENDPOINTS.map(async (endpoint) => {
        try {
          const url = new URL(endpoint);
          url.searchParams.set("sitemap", sitemap);
          url.searchParams.set("key", key);
          url.searchParams.set("keyLocation", keyLocation);

          const res = await fetch(url.toString(), { method: "GET" });
          const text = await res.text();
          return {
            endpoint: `${endpoint} (GET ping)`,
            ok: res.ok,
            status: res.status,
            body: text.slice(0, 1000),
          };
        } catch (err) {
          return {
            endpoint: `${endpoint} (GET ping)`,
            ok: false,
            status: 0,
            body: String(err).slice(0, 1000),
          };
        }
      }),
    );

    return new Response(
      JSON.stringify({
        submittedUrls: urls.length,
        sitemap,
        post: endpointResults,
        get: pingResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      submittedUrls: urls.length,
      post: endpointResults,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

