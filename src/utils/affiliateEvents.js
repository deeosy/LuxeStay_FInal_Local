const FUNCTION_PATH = '/.netlify/functions/affiliate-events';

const buildEventKey = ({ eventType, hotelId, citySlug, filterSlug, pageUrl }) => {
  const parts = [
    eventType || '',
    hotelId || '',
    citySlug || '',
    filterSlug || '',
    pageUrl || '',
  ];

  return `affiliate_event:${parts.join(':')}`;
};

export const trackAffiliateEvent = ({
  eventType,
  hotelId,
  citySlug,
  filterSlug,
  pageUrl,
}) => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  if (!eventType || !hotelId) {
    return;
  }

  const url = FUNCTION_PATH;
  const resolvedPageUrl = pageUrl || `${window.location.pathname}${window.location.search}`;

  const key = buildEventKey({
    eventType,
    hotelId,
    citySlug,
    filterSlug,
    pageUrl: resolvedPageUrl,
  });

  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) {
      return;
    }
    window.sessionStorage.setItem(key, '1');
  } catch (error) {
    console.warn('Affiliate event dedupe failed', error);
  }

  const body = JSON.stringify({
    event_type: eventType,
    hotel_id: hotelId,
    city_slug: citySlug || null,
    filter_slug: filterSlug || null,
    page_url: resolvedPageUrl,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) {
        return;
      }
    }
  } catch (error) {
    console.warn('Affiliate event sendBeacon failed', error);
  }

  try {
    void fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: true,
    });
  } catch (error) {
    console.warn('Affiliate event fetch failed', error);
  }
};
