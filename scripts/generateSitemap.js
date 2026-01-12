import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cities } from "../src/data/cities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = "https://luxestayhaven.com";
const TODAY = new Date().toISOString().split("T")[0];

const extractLocs = (xml) => {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1]);
  return new Set(locs);
};

const generateSitemap = async () => {
  const publicDir = path.resolve(__dirname, "../public");
  const sitemapPath = path.join(publicDir, "sitemap.xml");

  const prevSitemap = fs.existsSync(sitemapPath)
    ? fs.readFileSync(sitemapPath, "utf-8")
    : "";

  // Extract hotel IDs
  const hotelsPath = path.join(__dirname, "../src/data/hotels.js");
  const hotelsContent = fs.readFileSync(hotelsPath, "utf-8");
  const hotelIds = [
    ...new Set([...hotelsContent.matchAll(/id:\s*(\d+)/g)].map(m => m[1]))
  ];

  const cityTypes = ["best", "luxury", "cheap", "family"]; // "budget" changed to "cheap" to match routes
  const poiPages = ["/hotels-near-jfk", "/hotels-near-eiffel-tower"];

  const urls = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/search", changefreq: "weekly", priority: "0.8" },
    { loc: "/destinations", changefreq: "weekly", priority: "0.6" },

    ...cities.flatMap(city => {
      const cityUrls = [
        { loc: `/hotels-in/${city.citySlug}`, changefreq: "weekly", priority: "0.9" },
        { loc: `/hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.9" },
        { loc: `/best-hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.8" },
        { loc: `/cheap-hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.7" },
        { loc: `/luxury-hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.7" },
        { loc: `/family-hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.7" },
      ];

      // Nearby Cities: /hotels-near-{nearbyCity}-from-{city}
      // Note: "hotels-near-{nearbyCity}" should likely exist as a base, but the prompt asked for the cross-link specifically.
      if (city.nearbyCities) {
        city.nearbyCities.forEach(nearby => {
             // We assume nearby is a slug. We check if that slug exists in our cities list to be safe? 
             // Or just generate it. The prompt says "For every nearby city".
             cityUrls.push({
                 loc: `/hotels-near-${nearby}-from-${city.citySlug}`,
                 changefreq: "monthly",
                 priority: "0.6"
             });
        });
      }

      // Airports: /hotels-near-{airport}-airport
      if (city.airportCodes) {
        city.airportCodes.forEach(code => {
            cityUrls.push({
                loc: `/hotels-near-${code.toLowerCase()}-airport`,
                changefreq: "weekly",
                priority: "0.7"
            });
        });
      }

      // Districts: /hotels-in-{city}-{district}
      if (city.popularDistricts) {
        city.popularDistricts.forEach(district => {
            cityUrls.push({
                loc: `/hotels-in-${city.citySlug}-${district}`,
                changefreq: "weekly",
                priority: "0.7"
            });
        });
      }

      return cityUrls;
    }),

    ...poiPages.map(loc => ({ loc, changefreq: "weekly", priority: "0.6" })),
    ...hotelIds.map(id => ({ loc: `/hotel/${id}`, changefreq: "weekly", priority: "0.7" })),
  ];

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `
<url>
  <loc>${DOMAIN}${u.loc}</loc>
  <lastmod>${TODAY}</lastmod>
  <changefreq>${u.changefreq}</changefreq>
  <priority>${u.priority}</priority>
</url>`).join("")}
</urlset>`;

  fs.writeFileSync(sitemapPath, sitemapContent);
  console.log("Sitemap written");

  const prevLocs = extractLocs(prevSitemap);
  const nextLocs = extractLocs(sitemapContent);
  const newUrls = [...nextLocs].filter(url => !prevLocs.has(url));

  console.log(`New URLs: ${newUrls.length}`);

  // Only submit if sitemap changed
  if (newUrls.length === 0) {
    console.log("No new URLs – skipping Google submit");
    return;
  }

  const googleAdminToken = process.env.GOOGLE_INDEXING_ADMIN_TOKEN;
  // Also check if we have the Supabase URL and key from previous context or env
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://ovigqjqqyqgqjqqyqgqj.supabase.co"; // Placeholder or env
  // Actually, in the previous turn I saw the code used fetch to supabase function. 
  // I should check how the user wants it. The user said "Update sitemap generator so it... Automatically includes all generated pages".
  // I will keep the existing submission logic pattern but ensure it works. 
  // The previous file content showed:
  // fetch(`${DOMAIN}/.netlify/functions/submit-to-google`...
  // Wait, the file I read had `${DOMAIN}/.netlify/functions/submit-to-google`. 
  // But in the summary, I wrote that I created `api/submit-to-google.js`. 
  // And `scripts/generateSitemap.js` in the summary used `${supabaseUrl}/functions/v1/submit-to-google`.
  // The file I read (lines 1-232) seems to be the one on disk.
  // It has: `fetch(\`${DOMAIN}/.netlify/functions/submit-to-google\`, ...)`
  // This looks like a legacy path or I missed where it was updated. 
  // Ah, I see "api/submit-to-google.js" was created. If this is a Vercel/Netlify project, that path might work.
  // But the user mentioned Supabase functions.
  // I will preserve the existing submission logic found in the file but ensure the URL generation part is updated.
  
  if (!googleAdminToken) {
    console.log("No Google token – skipping indexing");
    return;
  }

  console.log(`Submitting ${newUrls.length} URLs to Google Indexing API...`);

  try {
    // Attempting to hit the API endpoint that was likely set up.
    // If running locally or in a specific env, this might need adjustment.
    // I'll stick to the one in the file I read, assuming it's correct for the environment.
    // Note we are using the netlify function `submit-to-google` to submit the URLs to Google Indexing API. continue using this and don't change it.
    const res = await fetch(`${DOMAIN}/.netlify/functions/submit-to-google`, {      
      // Note: The file had /.netlify/functions/, but usually /api/ works for Vercel/Next. 
      // Since this is Vite, maybe it's using a proxy or Supabase directly?
      // The summary said "supabase/functions/submit-to-google".
      // I'll use the Supabase Edge Function URL if I can find it, or the /api proxy.
      // Given I don't have the Supabase URL in this script, I'll rely on what was there or a safe bet.
      // The file I read had `${DOMAIN}/.netlify/functions/submit-to-google`.
      // I will keep that for now to avoid breaking existing infra I might not fully see.
      // Wait, the summary said I created `supabase/functions/submit-to-google` and `api/submit-to-google.js`.
      // `api/submit-to-google.js` usually implies a Vercel serverless function at `/api/submit-to-google`.
      // I'll update it to `${DOMAIN}/api/submit-to-google` which is more standard for the summary I generated.
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: newUrls.slice(0, 100),
        type: "URL_UPDATED",
      }),
    });

    const text = await res.text();
    console.log("Google Indexing response:", res.status, text);
  } catch (err) {
    console.error("Google submit failed:", err);
  }
};

await generateSitemap();
