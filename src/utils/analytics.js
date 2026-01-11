import ReactGA from 'react-ga4';

// Initialize GA4
export const initGA = () => {
  // Replace with your actual Measurement ID
  const TRACKING_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-PLACEHOLDER'; 
  ReactGA.initialize(TRACKING_ID);
  console.log('GA4 Initialized with ID:', TRACKING_ID);
};

// Track Page Views
export const trackPageView = (path) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

// Track Events
export const trackEvent = (category, action, label, value) => {
  ReactGA.event({
    category,
    action,
    label,
    value,
  });
};

// Custom Events based on user requirements

export const trackBookingClick = ({ hotel_id, city, price, check_in, check_out, guests, rooms }) => {
  ReactGA.event('booking_click', {
    hotel_id,
    city,
    price,
    source: 'liteapi',
    check_in,
    check_out,
    guests,
    rooms,
  });
};

export const trackAffiliateRedirect = ({ hotel_id, city }) => {
  ReactGA.event('affiliate_redirect', {
    hotel_id,
    city,
    partner: 'liteapi',
  });
};

export const trackSearch = ({ destination, check_in, check_out, guests, rooms }) => {
  ReactGA.event('search', {
    destination,
    check_in,
    check_out,
    guests,
    rooms,
  });
};

export const trackCityView = (city) => {
  ReactGA.event('city_view', {
    city_name: city,
  });
};

export const trackHotelView = ({ hotel_id, name, city, price }) => {
  ReactGA.event('hotel_view', {
    hotel_id,
    hotel_name: name,
    city,
    price,
  });
};
