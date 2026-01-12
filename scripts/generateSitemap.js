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
  const hotelIds = [...new Set([...hotelsContent.matchAll(/id:\s*(\d+)/g)].map(m => m[1]))];

  const cityTypes = ["best", "luxury", "budget", "family"];
  const poiPages = ["/hotels-near-jfk", "/hotels-near-eiffel-tower"];

  const urls = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/search", changefreq: "weekly", priority: "0.8" },
    { loc: "/destinations", changefreq: "weekly", priority: "0.6" },
    ...cities.flatMap(city => [
      { loc: `/hotels-in/${city.citySlug}`, changefreq: "weekly", priority: "0.9" },
      { loc: `/hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.9" },
      { loc: `/best-hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.8" },
      { loc: `/cheap-hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.7" },
      { loc: `/luxury-hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.7" },
      { loc: `/family-hotels-in-${city.citySlug}`, changefreq: "weekly", priority: "0.7" },
      ...cityTypes.map(type => ({
        loc: `/hotels-in/${city.citySlug}/${type}`,
        changefreq: "weekly",
        priority: "0.6",
      })),
    ]),
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

  if (newUrls.length === 0) return;

  const googleAdminToken = process.env.GOOGLE_INDEXING_ADMIN_TOKEN;

  if (!googleAdminToken) {
    console.log("No Google token – skipping indexing");
    return;
  }

  console.log("Submitting to Google Indexing API...");

  try {
    const res = await fetch(`${DOMAIN}/api/submit-to-google`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls: newUrls, type: "URL_UPDATED" }),
    });

    const text = await res.text();
    console.log("Google Indexing response:", res.status, text);
  } catch (err) {
    console.error("Google submit failed:", err);
  }
};

await generateSitemap();
