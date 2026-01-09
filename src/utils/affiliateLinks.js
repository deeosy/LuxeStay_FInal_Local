/**
 * Affiliate Link Builder Utility
 * 
 * Generates outbound booking URLs with affiliate parameters.
 * Providers can be swapped by changing the provider configuration.
 */

// Affiliate configuration (placeholder - swap providers here)
const AFFILIATE_CONFIG = {
  // Default affiliate ID
  affiliateId: 'demo123',
  
  // Provider configurations - add new providers here
  providers: {
    // Placeholder provider (for demo/development)
    placeholder: {
      name: 'Demo Provider',
      baseUrl: 'https://booking.example.com/reserve',
      buildUrl: (params) => {
        const url = new URL('https://booking.example.com/reserve');
        url.searchParams.set('hotel_id', params.hotelId);
        url.searchParams.set('checkin', params.checkIn);
        url.searchParams.set('checkout', params.checkOut);
        url.searchParams.set('guests', params.guests);
        url.searchParams.set('aff_id', params.affiliateId);
        url.searchParams.set('utm_source', 'luxestay');
        url.searchParams.set('utm_medium', 'affiliate');
        url.searchParams.set('utm_campaign', 'booking');
        return url.toString();
      },
    },
    
    // Booking.com style (example for future integration)
    bookingcom: {
      name: 'Booking.com',
      baseUrl: 'https://www.booking.com/hotel',
      buildUrl: (params) => {
        const url = new URL(`https://www.booking.com/hotel/${params.hotelSlug}.html`);
        url.searchParams.set('checkin', params.checkIn);
        url.searchParams.set('checkout', params.checkOut);
        url.searchParams.set('group_adults', params.guests);
        url.searchParams.set('aid', params.affiliateId);
        return url.toString();
      },
    },
    
    // Expedia style (example for future integration)
    expedia: {
      name: 'Expedia',
      baseUrl: 'https://www.expedia.com/Hotel-Search',
      buildUrl: (params) => {
        const url = new URL('https://www.expedia.com/Hotel-Search');
        url.searchParams.set('hotelId', params.hotelId);
        url.searchParams.set('chkin', params.checkIn);
        url.searchParams.set('chkout', params.checkOut);
        url.searchParams.set('adults', params.guests);
        url.searchParams.set('affcid', params.affiliateId);
        return url.toString();
      },
    },
  },
  
  // Current active provider
  activeProvider: 'placeholder',
};

/**
 * Create a URL-safe slug from hotel name
 */
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Build an affiliate booking URL for a hotel
 * 
 * @param {Object} options - Booking options
 * @param {Object} options.hotel - Hotel object with id and name
 * @param {string} options.checkIn - Check-in date (YYYY-MM-DD)
 * @param {string} options.checkOut - Check-out date (YYYY-MM-DD)
 * @param {number} options.guests - Number of guests
 * @param {string} [options.provider] - Provider key (optional, uses active provider)
 * @returns {string} The affiliate booking URL
 */
export const buildAffiliateUrl = ({
  hotel,
  checkIn,
  checkOut,
  guests,
  provider = AFFILIATE_CONFIG.activeProvider,
}) => {
  const providerConfig = AFFILIATE_CONFIG.providers[provider];
  
  if (!providerConfig) {
    console.warn(`Unknown affiliate provider: ${provider}, falling back to placeholder`);
    return buildAffiliateUrl({ hotel, checkIn, checkOut, guests, provider: 'placeholder' });
  }
  
  const params = {
    hotelId: hotel.id,
    hotelSlug: createSlug(hotel.name),
    hotelName: hotel.name,
    checkIn: checkIn || '',
    checkOut: checkOut || '',
    guests: guests || 2,
    affiliateId: AFFILIATE_CONFIG.affiliateId,
  };
  
  return providerConfig.buildUrl(params);
};

/**
 * Get the current affiliate configuration (for debugging/display)
 */
export const getAffiliateConfig = () => ({
  affiliateId: AFFILIATE_CONFIG.affiliateId,
  activeProvider: AFFILIATE_CONFIG.activeProvider,
  providerName: AFFILIATE_CONFIG.providers[AFFILIATE_CONFIG.activeProvider]?.name,
});

/**
 * Set the active affiliate provider
 * 
 * @param {string} providerKey - The provider key to activate
 */
export const setActiveProvider = (providerKey) => {
  if (AFFILIATE_CONFIG.providers[providerKey]) {
    AFFILIATE_CONFIG.activeProvider = providerKey;
  } else {
    console.warn(`Unknown provider: ${providerKey}`);
  }
};

/**
 * Set the affiliate ID
 * 
 * @param {string} affiliateId - The new affiliate ID
 */
export const setAffiliateId = (affiliateId) => {
  AFFILIATE_CONFIG.affiliateId = affiliateId;
};

export default buildAffiliateUrl;
