import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SubmitBody = {
  urls: string[];
  type?: "URL_UPDATED" | "URL_DELETED";
};

const GOOGLE_SCOPE = "https://www.googleapis.com/auth/indexing";
const TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const INDEXING_PUBLISH_URL =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

const base64UrlEncode = (input: Uint8Array) => {
  let str = "";
  for (let i = 0; i < input.length; i++) str += String.fromCharCode(input[i]);
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const utf8 = (s: string) => new TextEncoder().encode(s);

const pemToArrayBuffer = (pem: string) => {
  const normalized = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const importPrivateKey = async (pem: string) => {
  const keyData = pemToArrayBuffer(pem);
  return await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
};

const signJwtRs256 = async (payload: Record<string, unknown>, pem: string) => {
  const header = { alg: "RS256", typ: "JWT" };
  const headerPart = base64UrlEncode(utf8(JSON.stringify(header)));
  const payloadPart = base64UrlEncode(utf8(JSON.stringify(payload)));
  const signingInput = `${headerPart}.${payloadPart}`;
  const key = await importPrivateKey(pem);
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    utf8(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
};

const parseBearer = (value: string | null) => {
  if (!value) return null;
  const m = value.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
};

const getAccessToken = async () => {
  const base64 = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_BASE64");
  if (!base64) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_BASE64");
  const raw = atob(base64);  // atob decodes base64 to string

  let key: any;
  try {
    key = JSON.parse(raw);
  } catch (_err) {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const clientEmail = String(key.client_email || "");
  const privateKey = String(key.private_key || "");
  if (!clientEmail || !privateKey) {
    throw new Error("Service account JSON must include client_email and private_key");
  }

  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwtRs256(
    {
      iss: clientEmail,
      scope: GOOGLE_SCOPE,
      aud: TOKEN_AUDIENCE,
      iat: now,
      exp: now + 3600,
    },
    privateKey,
  );

  const body = new URLSearchParams();
  body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  body.set("assertion", jwt);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${text.slice(0, 1000)}`);
  }

  const json = JSON.parse(text);
  const accessToken = String(json.access_token || "");
  if (!accessToken) throw new Error("Missing access_token in token response");
  return accessToken;
};

const normalizeUrl = (value: unknown) => {
  const s = String(value || "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.hash = "";
    return u.toString();
  } catch (_err) {
    return null;
  }
};

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

  const expectedToken = Deno.env.get("GOOGLE_INDEXING_ADMIN_TOKEN");
  const providedToken = parseBearer(req.headers.get("authorization"));
  if (!expectedToken || !providedToken || providedToken !== expectedToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const type = body.type ?? "URL_UPDATED";
  if (type !== "URL_UPDATED" && type !== "URL_DELETED") {
    return new Response(JSON.stringify({ error: "type must be URL_UPDATED or URL_DELETED" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawUrls = Array.isArray(body.urls) ? body.urls : [];
  const normalized = rawUrls
    .map(normalizeUrl)
    .filter((u): u is string => typeof u === "string");

  const unique = Array.from(new Set(normalized));
  if (unique.length === 0) {
    return new Response(JSON.stringify({ error: "urls must be a non-empty array of absolute URLs" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = await getAccessToken();

  const concurrency = 5;
  const results: Array<{ url: string; ok: boolean; status: number; body: string }> = [];

  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, unique.length) }).map(async () => {
    while (true) {
      const current = unique[index++];
      if (!current) break;
      try {
        const res = await fetch(INDEXING_PUBLISH_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({ url: current, type }),
        });
        const text = await res.text();
        results.push({
          url: current,
          ok: res.ok,
          status: res.status,
          body: text.slice(0, 2000),
        });
      } catch (err) {
        results.push({
          url: current,
          ok: false,
          status: 0,
          body: String(err).slice(0, 2000),
        });
      }
    }
  });

  await Promise.all(workers);
  results.sort((a, b) => a.url.localeCompare(b.url));

  const summary = results.reduce(
    (acc, r) => {
      if (r.ok) acc.success += 1;
      else acc.failed += 1;
      return acc;
    },
    { success: 0, failed: 0 },
  );

  return new Response(
    JSON.stringify({
      type,
      submitted: unique.length,
      success: summary.success,
      failed: summary.failed,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

