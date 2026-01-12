import jwt from "jsonwebtoken";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const authHeader = event.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token || token !== process.env.GOOGLE_INDEXING_ADMIN_TOKEN) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    const { urls, type } = JSON.parse(event.body || "{}");

    if (!urls || !Array.isArray(urls)) {
      return { statusCode: 400, body: "Invalid payload" };
    }

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

    if (!tokenData.access_token) {
      return {
        statusCode: 500,
        body: JSON.stringify(tokenData),
      };
    }

    const accessToken = tokenData.access_token;

    const results = [];

    for (const url of urls.slice(0, 100)) {
      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          type: type || "URL_UPDATED",
        }),
      });

      const text = await res.text();
      results.push({ url, status: res.status, body: text });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ submitted: results.length, results }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
