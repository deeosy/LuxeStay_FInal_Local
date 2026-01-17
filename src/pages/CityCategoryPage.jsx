import { useMemo, useEffect } from 'react';
import { useParams, Link, Navigate, useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HotelCard from '@/components/HotelCard';
import { useLiteApiSearch } from '@/hooks/useLiteApiHotels';
import { getCityBySlug } from '@/data/cities';
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import useBookingStore from '@/stores/useBookingStore';
import SEOMetadata from '@/components/seo/SEOMetadata';
import { useIndexing } from '@/hooks/useIndexing';
import { useRevenueEngine } from '@/hooks/useRevenueEngine';
import SEOFooter from '@/components/SEOFooter';

const CATEGORIES = ['best', 'luxury', 'budget', 'family'];

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);


const CityCategoryPage = () => {
  const { citySlug, type } = useParams();
  const city = getCityBySlug(citySlug);
  const isValid = !!city && CATEGORIES.includes(type);
  
  const { checkIn, checkOut, guests, rooms } = useBookingStore();
  const { shouldHideHotel, sortHotelsByRevenue } = useRevenueEngine();

  // ✅ Corrected: Choose ONE param to avoid breaking LiteAPI
  const searchParams = useMemo(() => {
    if (!city) return { enabled: false };

    // If we have the ID, use only the ID
    if (city.liteApiLocationId) {
      return {
        locationId: city.liteApiLocationId,
        checkIn,
        checkOut,
        guests,
        rooms,
        enabled: isValid
      };
    }

    // Otherwise, fallback to text destination
    return {
      destination: city.query || city.cityName,
      checkIn,
      checkOut,
      guests,
      rooms,
      enabled: isValid
    };
  }, [city, checkIn, checkOut, guests, rooms, isValid]);

  // Use the clean params
  const { hotels, loading, error } = useLiteApiSearch(searchParams);


  const filteredHotels = useMemo(() => {
    if (!hotels) return [];
    
    // First, filter out low performers
    const visibleHotels = hotels.filter(h => {
        const id = h.liteApiId || h.id;
        return !shouldHideHotel(id);
    });
    
    const filtered = [...visibleHotels];

    switch (type) {
      case 'best':
        // Sort by Revenue (EPC * Volume) instead of rating
        return sortHotelsByRevenue(filtered);
      case 'luxury':
        // Filter by price > 300 OR rating >= 4.5, sort by Revenue
        return sortHotelsByRevenue(
            filtered.filter(h => h.price >= 300 || h.rating >= 4.5)
        );
      case 'budget':
        // Sort by price ascending (keep price sort for budget as it's the defining feature)
        return filtered.sort((a, b) => a.price - b.price);
      case 'family':
        // Filter by guest capacity >= 3 OR rating >= 4.0, sort by Revenue
        return sortHotelsByRevenue(
             filtered.filter(h => h.guests >= 3 || h.rating >= 4.0)
        );
      default:
        return sortHotelsByRevenue(filtered);
    }
  }, [hotels, type, shouldHideHotel, sortHotelsByRevenue]);

  const cityAverage = useMemo(() => {
    if (!filteredHotels.length) return 0;
    return filteredHotels.reduce((acc, h) => acc + (h.price || 0), 0) / filteredHotels.length;
  }, [filteredHotels]);

  const budgetThreshold = useMemo(() => {
    if (!filteredHotels.length) return null;
    const prices = filteredHotels
      .map(h => h.price || 0)
      .filter(price => price > 0);
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const index = Math.floor((sorted.length - 1) * 0.3);
    return sorted[index];
  }, [filteredHotels]);

  // Dynamic Content Generation
  const pageTitle = isValid ? `${capitalize(type)} Hotels in ${city.cityName}` : 'Hotels';
  
  const location = useLocation();
  const pageUrl = `https://luxestayhaven.com${location.pathname}`;
  
  // Auto-submit
  useIndexing(pageUrl);

  const pageDescription = isValid 
    ? `Find the ${type} hotels in ${city.cityName}. Compare prices, read reviews, and book your stay with LuxeStay.` 
    : '';

  const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `Is ${city.cityName} good for ${type} travel?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes, ${city.cityName} offers excellent options for ${type} travelers, with a wide range of hotels and amenities suited for this travel style.`
          }
        },
        {
          "@type": "Question",
          "name": "When is the best time to book?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `${city.bestTimeToVisit} Booking 2-3 months in advance is recommended for the best rates.`
          }
        },
        {
          "@type": "Question",
          "name": "How much do hotels cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Hotel prices in ${city.cityName} typically range from ${city.averageHotelPrice}, but ${type} options may vary.`
          }
        }
      ]
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": filteredHotels.slice(0, 12).map((hotel, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Hotel",
        "name": hotel.name,
        "description": hotel.description,
        "image": hotel.image,
        "url": `https://luxestayhaven.com/hotel/${hotel.liteApiId || hotel.id}`,
        "priceRange": `$${hotel.price}`,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": hotel.rating,
          "reviewCount": hotel.reviews || 0
        }
      }
    }))
  };

  if (!isValid) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOMetadata
        title={`${pageTitle} | LuxeStay`}
        description={pageDescription}
        ogType="website"
        schema={[faqSchema, itemListSchema]}
      />
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-12 max-w-4xl mx-auto text-center">
          <Link 
            to={`/hotels-in/${citySlug}`}
            className="text-primary hover:underline text-sm font-medium mb-4 inline-block"
          >
            ← Back to all {city.cityName} hotels
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {pageTitle}
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {city.shortIntro}
          </p>
        </div>

        {/* Hotel Grid */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-red-600 mb-2">Error loading hotels</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHotels.slice(0, 12).map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                cityAverage={cityAverage}
                budgetThreshold={budgetThreshold}
              />
            ))}
          </div>
        )}

        {/* SEO Content Section */}
        {!loading && !error && (
          <div className="mt-20 max-w-4xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Why book {type} hotels in {city.cityName}?
            </h2>
            <div className="prose prose-blue max-w-none text-gray-600">
              <p className="mb-4">
                Finding the perfect {type} hotel in {city.cityName} can transform your trip from ordinary to extraordinary. 
                {city.cityName} is known for its {city.travelTags.join(', ').toLowerCase()}, making it a prime destination for travelers seeking quality accommodation.
              </p>
              <p className="mb-4">
                Our curated selection of {type} hotels offers the best combination of value, location, and amenities. 
                Whether you're visiting for {city.bestAreas[0].split(' - ')[1]} or simply exploring the city, these properties ensure a memorable stay.
              </p>
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Top reasons to visit {city.cityName}</h3>
              <ul className="list-none space-y-2 mb-6">
                {city.bestAreas.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
              <p>
                <strong>Best time to visit:</strong> {city.bestTimeToVisit}
              </p>
            </div>
          </div>
        )}

        {/* Internal Linking Graph */}
        <div className="mt-16 pt-12 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            More Hotel Options in {city.cityName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Link 
              to={`/hotels-in/${citySlug}`}
              className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 text-center font-medium text-gray-900 hover:text-primary"
            >
              All Hotels in {city.cityName}
            </Link>
            {CATEGORIES.filter(c => c !== type).map(cat => (
              <Link 
                key={cat}
                to={`/hotels-in/${citySlug}/${cat}`}
                className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 text-center font-medium text-gray-900 hover:text-primary"
              >
                {capitalize(cat)} Hotels
              </Link>
            ))}
          </div>
        </div>
      </main>
      
      {city && <SEOFooter currentCity={city} />}

      <Footer />
    </div>
  );
};

export default CityCategoryPage;
