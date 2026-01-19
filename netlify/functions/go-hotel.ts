import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    const path = event.path || "";
    const segments = path.split("/").filter(Boolean);
    const hotelId = segments[segments.length - 1];

    if (!hotelId) {
      return {
        statusCode: 400,
        body: "Missing hotelId",
      };
    }

    const params = event.queryStringParameters || {};
    const city = params.city || "";
    const hotelName = params.hotel || "";
    const price = params.price || "";
    const page = params.page || "";
    const checkIn = params.checkIn || "";
    const checkOut = params.checkOut || "";
    const guests = params.guests || "";
    const rooms = params.rooms || "";

    const fallbackLocation =
      page && typeof page === "string" && page.startsWith("/")
        ? page
        : `/hotel/${hotelId}`;

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase environment variables are not configured");

      const liteapiKey =
        process.env.LITEAPI_KEY_SANDBOX || process.env.VITE_LITEAPI_KEY;

      if (liteapiKey) {
        const directUrl = `https://api.liteapi.travel/v3/hotels/${hotelId}/book?apiKey=${liteapiKey}`;

        return {
          statusCode: 302,
          headers: {
            Location: directUrl,
          },
        };
      }

      return {
        statusCode: 302,
        headers: {
          Location: fallbackLocation,
        },
      };
    }

    const bookUrl = new URL(`${supabaseUrl}/functions/v1/liteapi`);
    bookUrl.searchParams.set("action", "book");
    bookUrl.searchParams.set("hotelId", hotelId);
    if (checkIn) bookUrl.searchParams.set("checkIn", checkIn);
    if (checkOut) bookUrl.searchParams.set("checkOut", checkOut);
    if (guests) bookUrl.searchParams.set("guests", guests);
    if (rooms) bookUrl.searchParams.set("rooms", rooms);

    let bookingUrl: string | null = null;

    try {
      const detailRes = await fetch(bookUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (detailRes.ok) {
        const detailData = await detailRes.json();
        bookingUrl = detailData?.bookingUrl || null;
      } else {
        console.error("LiteAPI detail error:", detailRes.status, await detailRes.text());
      }
    } catch (error) {
      console.error("Failed to fetch hotel detail from LiteAPI function", error);
    }

    if (bookingUrl) {
      const headers = event.headers || {};
      const userAgent =
        headers["user-agent"] ||
        headers["User-Agent"] ||
        "";
      const ip =
        headers["x-forwarded-for"] ||
        headers["client-ip"] ||
        headers["x-real-ip"] ||
        "";

      try {
        await fetch(`${supabaseUrl}/rest/v1/affiliate_clicks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            hotel_id: hotelId,
            city,
            hotel_name: hotelName,
            price: price ? Number(price) : null,
            page,
            check_in: checkIn || null,
            check_out: checkOut || null,
            guests: guests ? Number(guests) : null,
            booking_url: bookingUrl,
            user_agent: userAgent,
            ip,
          }),
        });
      } catch (error) {
        console.error("Failed to log affiliate click", error);
      }
    }

    const redirectLocation = bookingUrl || fallbackLocation;

    return {
      statusCode: 302,
      headers: {
        Location: redirectLocation,
      },
    };
  } catch (error) {
    console.error("go-hotel function error", error);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
