import jwt from "jsonwebtoken";

const INDEXNOW_KEY = "0d7f3c3d4b9f4c68a64b2fa3a3d4b8c2";
const HOST = "luxestayhaven.com";

// Helper to submit to IndexNow (Bing/Yandex)
async function submitToIndexNow(url) {
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/indexnow.txt`,
        urlList: [url],
      }),
    });
    const text = await response.text();
    console.log(`IndexNow for ${url}: ${response.status} - ${text}`);
    return { platform: "IndexNow", status: response.status, body: text };
  } catch (error) {
    console.error("IndexNow Error:", error);
    return { platform: "IndexNow", error: error.message };
  }
}

// Helper to submit to Google Indexing API
async function submitToGoogle(url, type = "URL_UPDATED") {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    console.log("Google Indexing skipped: Credentials missing");
    return { platform: "Google", status: "Skipped (No Creds)" };
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
    );

    const now = Math.floor(Date.now() / 1000);
    const jwtToken = jwt.sign(
      {
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/indexing",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      },
      serviceAccount.private_key,
      { algorithm: "RS256" }
    );

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwtToken,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Failed to get Google access token");

    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type }),
    });

    const text = await res.text();
    console.log(`Google Indexing for ${url}: ${res.status} - ${text}`);
    return { platform: "Google", status: res.status, body: text };

  } catch (error) {
    console.error("Google Indexing Error:", error);
    return { platform: "Google", error: error.message };
  }
}

export const handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { url } = JSON.parse(event.body || "{}");
    
    if (!url) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing 'url' field" }) };
    }

    // Run submissions in parallel
    const [indexNowResult, googleResult] = await Promise.all([
      submitToIndexNow(url),
      submitToGoogle(url)
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Submission processed",
        results: [indexNowResult, googleResult]
      })
    };

  } catch (error) {
    console.error("Handler Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
