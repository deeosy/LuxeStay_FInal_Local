import { createClient } from '@supabase/supabase-js';
import { getSeoIndexableCitySlugs } from '../utils/getSeoIndexableCitySlugs.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : null;

function buildSitemapXml(slugs) {
  const items = Array.isArray(slugs) ? slugs : [];

  const urlsXml = items
    .map(
      (slug) =>
        `  <url>
    <loc>https://luxestayhaven.com/hotels/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const headers = {
    'Content-Type': 'application/xml'
  };

  if (!supabase) {
    const xml = buildSitemapXml([]);
    return {
      statusCode: 200,
      headers,
      body: xml
    };
  }

  try {
    const slugs = await getSeoIndexableCitySlugs(supabase);
    const xml = buildSitemapXml(slugs);

    return {
      statusCode: 200,
      headers,
      body: xml
    };
  } catch (error) {
    console.error('sitemap.xml: unexpected error', error);
    const xml = buildSitemapXml([]);

    return {
      statusCode: 200,
      headers,
      body: xml
    };
  }
}

