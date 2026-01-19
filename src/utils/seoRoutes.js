
/**
 * Checks if a given pathname corresponds to an SEO virtual route or known destination pattern.
 * Used to suppress 404 warnings for valid SEO paths that might not match exact routes immediately
 * or to identify paths that should be handled gracefully.
 * 
 * @param {string} pathname 
 * @returns {boolean}
 */
export const isConsideredSeoRoute = (pathname) => {
  if (!pathname) return false;
  
  const seoPatterns = [
    /^\/best-hotels-in-/,
    /^\/cheap-hotels-in-/,
    /^\/luxury-hotels-in-/,
    /^\/family-hotels-in-/,
    /^\/hotels-in-/,
    /^\/hotels-near-/,
    /^\/hotels-in\//,
    /^\/hotels\//,
    /^\/top-cities/
  ];

  return seoPatterns.some(pattern => pattern.test(pathname));
};
