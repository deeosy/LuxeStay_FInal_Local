import { getEligiblePriceAlertUsers } from './getEligiblePriceAlertUsers';

/**
 * Builds the alert payload for a price drop event.
 * Resolves eligible users who should be notified.
 * 
 * @param {Object} signal - The price drop signal object
 * @param {string} signal.hotelId
 * @param {number} signal.previousPrice
 * @param {number} signal.newPrice
 * @param {number} signal.dropPercent
 * @returns {Promise<Object|null>} - Returns payload with users if eligible, otherwise null.
 */
export async function buildPriceDropAlertPayload(signal) {
  try {
    if (!signal || !signal.hotelId) return null;

    const { hotelId, previousPrice, newPrice, dropPercent } = signal;

    const users = await getEligiblePriceAlertUsers(hotelId);

    if (!users || users.length === 0) {
      return null;
    }

    return {
      hotelId,
      previousPrice,
      newPrice,
      dropPercent,
      users,
    };
  } catch (err) {
    // Silent failure
    return null;
  }
}
