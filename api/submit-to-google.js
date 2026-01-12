const readJson = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return null;
  return JSON.parse(raw);
};

const parseBearer = (value) => {
  if (!value) return null;
  const m = String(value).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
};

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization, content-type",
    );
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const expected = process.env.GOOGLE_INDEXING_ADMIN_TOKEN;
  const provided = parseBearer(req.headers.authorization);
  if (!expected || !provided || provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    res.status(500).json({ error: "Missing SUPABASE_URL" });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    res.status(400).json({ error: `Invalid JSON body: ${String(err)}` });
    return;
  }

  try {
    const upstream = await fetch(`${supabaseUrl}/functions/v1/submit-to-google`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provided}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body || {}),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
};

