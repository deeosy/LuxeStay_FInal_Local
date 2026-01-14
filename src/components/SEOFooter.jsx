import React from 'react';
import { Link } from 'react-router-dom';
import { cities } from '@/data/cities';

const SEOFooter = ({ currentCity, currentHotel }) => {
  // 1. Popular Destinations (Top Cities)
  const popularDestinations = cities.slice(0, 20);

  // 2. Best Hotels in {City} (All Cities)
  const bestHotelsLinks = cities.map(city => ({
    name: `Best Hotels in ${city.cityName}`,
    path: `/best-hotels-in-${city.citySlug}`
  }));

  // 3. Hotels Near {POI} & Categories
  // If we are on a city page, show POIs and Category links for that city.
  // If we are on a hotel page, show POIs for the hotel's city.
  // If global (Home), show a mix or top POIs.
  
  let poiLinks = [];
  if (currentCity) {
    // Add Category Links first
    poiLinks.push(
      { name: `Cheap Hotels in ${currentCity.cityName}`, path: `/cheap-hotels-in-${currentCity.citySlug}` },
      { name: `Luxury Hotels in ${currentCity.cityName}`, path: `/luxury-hotels-in-${currentCity.citySlug}` },
      { name: `Family Hotels in ${currentCity.cityName}`, path: `/family-hotels-in-${currentCity.citySlug}` },
      { name: `Best Hotels in ${currentCity.cityName}`, path: `/best-hotels-in-${currentCity.citySlug}` }
    );

    // City-specific POIs
    if (currentCity.airportCodes) {
      poiLinks.push(...currentCity.airportCodes.map(code => ({
        name: `Hotels Near ${code} Airport`,
        path: `/hotels-near-${code.toLowerCase()}-airport`
      })));
    }
    if (currentCity.popularDistricts) {
      poiLinks.push(...currentCity.popularDistricts.map(district => ({
        name: `Hotels in ${currentCity.cityName} - ${district.replace('-', ' ')}`,
        path: `/hotels-in-${currentCity.citySlug}-${district}`
      })));
    }
    // Nearby cities
    if (currentCity.nearbyCities) {
      poiLinks.push(...currentCity.nearbyCities.map(nearby => ({
        name: `Hotels near ${nearby} from ${currentCity.cityName}`,
        path: `/hotels-near-${nearby}-from-${currentCity.citySlug}`
      })));
    }
  } else {
    // Global/Home - Show top POIs from all cities (limit to avoid clutter)
    cities.slice(0, 5).forEach(city => {
       if (city.airportCodes && city.airportCodes.length > 0) {
         poiLinks.push({
           name: `Hotels Near ${city.airportCodes[0]} Airport`,
           path: `/hotels-near-${city.airportCodes[0].toLowerCase()}-airport`
         });
       }
    });
  }

  return (
    <div className="bg-gray-100 py-12 border-t border-gray-200 mt-12">
      <div className="container-luxury">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          
          {/* Column 1: Popular Destinations */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider">Popular Destinations</h3>
            <ul className="space-y-2">
              {popularDestinations.map(city => (
                <li key={city.citySlug}>
                  <Link to={`/hotels-in/${city.citySlug}`} className="text-gray-600 hover:text-primary transition-colors">
                    Hotels in {city.cityName}
                  </Link>
                </li>
              ))}
              <li>
                 <Link to="/top-cities" className="text-primary font-medium hover:underline">
                    View All Top Cities
                 </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Best Hotels */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider">Curated Collections</h3>
            <ul className="space-y-2">
              {bestHotelsLinks.slice(0, 15).map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path} className="text-gray-600 hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Near Landmarks */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-wider">
              {currentCity ? `Near ${currentCity.cityName} Landmarks` : "Popular Landmarks"}
            </h3>
            <ul className="space-y-2">
              {poiLinks.length > 0 ? poiLinks.slice(0, 15).map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path} className="text-gray-600 hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              )) : (
                <li className="text-gray-500 italic">Select a destination to see landmarks.</li>
              )}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SEOFooter;
