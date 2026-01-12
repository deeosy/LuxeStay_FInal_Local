import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import cities and hotels data
import { cities } from '../src/data/cities.js';
// We cannot import hotels.js directly because it imports images which Node.js doesn't handle natively
// import { allHotels } from '../src/data/hotels.js';

const DOMAIN = 'https://luxestayhaven.com';
const TODAY = new Date().toISOString().split('T')[0];

const generateSitemap = () => {
  const publicDir = path.resolve(__dirname, '../public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  const prevSitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf-8') : '';

  // Extract hotel IDs manually from the file content
  const hotelsPath = path.join(__dirname, '../src/data/hotels.js');
  const hotelsContent = fs.readFileSync(hotelsPath, 'utf-8');
  const hotelIds = [];
  const idRegex = /id:\s*(\d+)/g;
  let match;
  while ((match = idRegex.exec(hotelsContent)) !== null) {
    // Avoid duplicates
    if (!hotelIds.includes(match[1])) {
      hotelIds.push(match[1]);
    }
  }

  const cityTypes = ['best', 'luxury', 'budget', 'family'];
  const poiPages = ['/hotels-near-jfk', '/hotels-near-eiffel-tower'];

  const urls = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/search', changefreq: 'weekly', priority: '0.8' },
    { loc: '/destinations', changefreq: 'weekly', priority: '0.6' },
    ...cities.flatMap((city) => ([
      {
        loc: `/hotels-in/${city.citySlug}`,
        changefreq: 'weekly',
        priority: '0.9',
      },
      {
        loc: `/hotels-in-${city.citySlug}`,
        changefreq: 'weekly',
        priority: '0.9',
      },
      {
        loc: `/best-hotels-in-${city.citySlug}`,
        changefreq: 'weekly',
        priority: '0.8',
      },
      {
        loc: `/cheap-hotels-in-${city.citySlug}`,
        changefreq: 'weekly',
        priority: '0.7',
      },
      {
        loc: `/luxury-hotels-in-${city.citySlug}`,
        changefreq: 'weekly',
        priority: '0.7',
      },
      {
        loc: `/family-hotels-in-${city.citySlug}`,
        changefreq: 'weekly',
        priority: '0.7',
      },
      ...cityTypes.map((type) => ({
        loc: `/hotels-in/${city.citySlug}/${type}`,
        changefreq: 'weekly',
        priority: '0.6',
      })),
    ])),
    ...poiPages.map((loc) => ({
      loc,
      changefreq: 'weekly',
      priority: '0.6',
    })),
    ...hotelIds.map(id => ({
      loc: `/hotel/${id}`,
      changefreq: 'weekly',
      priority: '0.7'
    }))
  ];

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${DOMAIN}${url.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(sitemapPath, sitemapContent);
  console.log(`Sitemap generated at ${sitemapPath}`);

  const extractLocs = (xml) => {
    const locs = [];
    const re = /<loc>([^<]+)<\/loc>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      locs.push(m[1]);
    }
    return new Set(locs);
  };

  const prevLocs = extractLocs(prevSitemap);
  const nextLocs = extractLocs(sitemapContent);
  const newUrls = [];
  for (const loc of nextLocs) {
    if (!prevLocs.has(loc)) newUrls.push(loc);
  }

  const adminToken = process.env.INDEXNOW_ADMIN_TOKEN;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const indexNowKey = process.env.INDEXNOW_KEY;
  const googleAdminToken = process.env.GOOGLE_INDEXING_ADMIN_TOKEN;
  const shouldPing = prevSitemap.trim().length === 0 || newUrls.length > 0;

  if (shouldPing && adminToken && supabaseUrl && anonKey && indexNowKey) {
    fetch(`${supabaseUrl}/functions/v1/indexnow`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'x-indexnow-admin-token': adminToken,
      },
      body: JSON.stringify({
        key: indexNowKey,
        keyLocation: `${DOMAIN}/indexnow.txt`,
        host: new URL(DOMAIN).host,
        sitemap: `${DOMAIN}/sitemap.xml`,
        urls: newUrls.slice(0, 10000),
      }),
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          console.error(`IndexNow ping failed: ${res.status} ${text}`);
          return;
        }
        console.log(`IndexNow pinged (${newUrls.length} new URLs)`);
      })
      .catch((err) => {
        console.error('IndexNow ping error:', err);
      });
  }

  if (shouldPing && newUrls.length > 0 && googleAdminToken) {
    fetch(`${DOMAIN}/api/submit-to-google`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${googleAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls: newUrls, type: 'URL_UPDATED' }),
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          console.error(`Google Indexing submit failed: ${res.status} ${text}`);
          return;
        }
        console.log(`Google Indexing submitted (${newUrls.length} new URLs)`);
      })
      .catch((err) => {
        console.error('Google Indexing submit error:', err);
      });
  }
};

generateSitemap();
