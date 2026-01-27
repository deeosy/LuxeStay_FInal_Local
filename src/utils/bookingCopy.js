/**
 * Determines the appropriate CTA label based on hotel characteristics
 * @param {number} rating - Hotel rating (0-5)
 * @param {boolean} isBudget - Whether hotel is budget-tier
 * @param {number} price - Nightly price
 * @returns {string} CTA label text
 */
export const getBookingLabel = (rating, isBudget, price) => {
  if (!price || price <= 0) return 'Check Availability';
  if (isBudget) return 'View Cheapest Option';
  if (rating >= 4.5) return 'View Best Rated Deal';
  return 'View Best Deal';
};

/**
 * Generates price positioning microcopy
 * @param {number} price - Hotel price
 * @param {number} average - City average price
 * @param {string} city - City name
 * @param {boolean} isBudget - Whether hotel is budget-tier
 * @param {boolean} favorited - Whether user saved this hotel
 * @returns {string|null} Microcopy text or null
 */
export const getPriceMicrocopy = (price, average, city, isBudget, favorited = false) => {
  if (favorited) return 'Still interested?';
  if (!price || price <= 0 || !average) return null;
  if (isBudget) return 'One of the better-priced hotels in this area';
  
  if (price < average) {
    if (city) return `Great value for stays in ${city}`;
    return 'Great value compared with similar stays';
  }
  
  return 'Priced similarly to other stays in this area';
};