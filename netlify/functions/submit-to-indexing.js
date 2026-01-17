import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    // Add to indexing_queue
    const { error } = await supabase
      .from("indexing_queue")
      .upsert({ url, submitted: false, priority: 1 }, { onConflict: "url" });

    if (error) {
      console.error("Queue Error:", error);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "URL queued for indexing", url }),
    };

  } catch (error) {
    console.error("Handler Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
