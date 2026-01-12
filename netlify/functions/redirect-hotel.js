export async function handler(event) {
  const hotelId = event.path.split("/").pop();

  if (!hotelId) {
    return {
      statusCode: 400,
      body: "Missing hotel id"
    };
  }

  // Sandbox LiteAPI link for now (safe)
  const LITEAPI_KEY = process.env.LITEAPI_KEY_SANDBOX;

  const url = `https://api.liteapi.travel/v3/hotels/${hotelId}/book?apiKey=${LITEAPI_KEY}`;

  return {
    statusCode: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-cache"
    }
  };
}