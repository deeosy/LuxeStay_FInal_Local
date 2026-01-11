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

  const urls = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/search', changefreq: 'weekly', priority: '0.8' },
    ...cities.map(city => ({
      loc: `/hotels-in/${city.citySlug}`,
      changefreq: 'weekly',
      priority: '0.9'
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

  const publicDir = path.resolve(__dirname, '../public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');

  fs.writeFileSync(sitemapPath, sitemapContent);
  console.log(`Sitemap generated at ${sitemapPath}`);
};

generateSitemap();
