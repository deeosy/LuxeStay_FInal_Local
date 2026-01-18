import { useEffect, useState } from 'react';

const cache = {
  fetched: false,
  slugs: []
};

export function useSeoEligibility(citySlug) {
  const [state, setState] = useState({
    loading: !cache.fetched,
    isSeoEligibleCity: true
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!citySlug) {
        if (!cancelled) {
          setState({
            loading: false,
            isSeoEligibleCity: true
          });
        }
        return;
      }

      if (cache.fetched) {
        const eligible = cache.slugs.includes(citySlug);
        if (!cancelled) {
          setState({
            loading: false,
            isSeoEligibleCity: eligible
          });
        }
        return;
      }

      try {
        const res = await fetch('/.netlify/functions/seo-city-eligibility');
        if (!res.ok) {
          throw new Error('Failed to load SEO eligibility');
        }
        const json = await res.json();
        const slugs = Array.isArray(json.eligibleSlugs) ? json.eligibleSlugs : [];
        cache.fetched = true;
        cache.slugs = slugs;
        const eligible = slugs.includes(citySlug);
        if (!cancelled) {
          setState({
            loading: false,
            isSeoEligibleCity: eligible
          });
        }
      } catch (_error) {
        if (!cancelled) {
          setState({
            loading: false,
            isSeoEligibleCity: true
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [citySlug]);

  return state;
}

