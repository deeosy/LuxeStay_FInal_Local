import { useEffect } from 'react';

/**
 * Hook to auto-submit current URL to Indexing API
 * Uses localStorage to limit submissions to once per 24h per URL
 */
export function useIndexing(url) {
  useEffect(() => {
    if (!url) return;
    
    // Check if running on localhost to avoid spamming from dev
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
      console.log('🧪 Skipping Google indexing in local dev:', url);
      return;
    }
    // In production, we want to index. In dev, we might skip or log.
    // For now, we'll allow it but log it, or maybe skip if it's strictly local.
    // The user requirement says "Auto-submit on page load".
    // I'll skip actual submission on localhost to prevent errors (Netlify function won't be reachable at relative path unless proxied)
    // But since we use relative path `/.netlify/functions/...`, it should work if using `netlify dev`.
    
    const key = `indexing_submitted_${url}`;
    const lastSubmitted = localStorage.getItem(key);
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    if (!lastSubmitted || (now - parseInt(lastSubmitted)) > ONE_DAY) {
      console.log(`🔍 Auto-indexing: ${url}`);
      
      fetch('/.netlify/functions/submit-to-indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      .then(res => res.json())
      .then(data => {
        console.log('✅ Indexing response:', data);
        localStorage.setItem(key, now.toString());
      })
      .catch(err => console.error('❌ Indexing failed:', err));
    } else {
      console.log(`Skipping indexing for ${url} (already submitted within 24h)`);
    }
  }, [url]);
}
