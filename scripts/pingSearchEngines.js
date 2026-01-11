// Script to ping search engines about sitemap updates
import https from 'https';

const SITEMAP_URL = 'https://luxestayhaven.com/sitemap.xml';

// Ping Google (Note: Google deprecated the sitemap ping endpoint in Dec 2023, but it's still good practice to have for historical reasons or if they bring it back/use it for other purposes)
const pingGoogle = () => {
  const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
  
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Successfully pinged Google.');
    } else {
      console.log(`❌ Failed to ping Google. Status code: ${res.statusCode}`);
    }
  }).on('error', (e) => {
    console.error(`❌ Error pinging Google: ${e.message}`);
  });
};

// Ping Bing (IndexNow)
const pingBing = () => {
  const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
  
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Successfully pinged Bing.');
    } else {
      console.log(`❌ Failed to ping Bing. Status code: ${res.statusCode}`);
    }
  }).on('error', (e) => {
    console.error(`❌ Error pinging Bing: ${e.message}`);
  });
};

console.log(`🚀 Pinging search engines with sitemap: ${SITEMAP_URL}`);
pingGoogle();
pingBing();
