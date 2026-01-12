import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HotelCard from '@/components/HotelCard';
import { useLiteApiSearch } from '@/hooks/useLiteApiHotels';
import { getCityBySlug, cities } from '@/data/cities';
import useBookingStore from '@/stores/useBookingStore';
import { trackCityView } from '@/utils/analytics';
import SEOMetadata from '@/components/seo/SEOMetadata';
import { useIndexing } from '@/hooks/useIndexing';
import { Loader2, MapPin, Calendar, DollarSign, ArrowRight, Filter, Trophy, ShieldCheck, CheckCircle } from 'lucide-react';

const SITE_ORIGIN = 'https://luxestayhaven.com';

const titleCaseFromSlug = (slug) => {
  return (slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const getCityPageVariant = (pathname) => {
  if (!pathname) return 'default';
  if (pathname.includes('/hotels-near-') && pathname.includes('-from-')) return 'nearby-from';
  if (pathname.startsWith('/best-hotels-in-')) return 'best';
  if (pathname.startsWith('/cheap-hotels-in-')) return 'cheap';
  if (pathname.startsWith('/luxury-hotels-in-')) return 'luxury';
  if (pathname.startsWith('/family-hotels-in-')) return 'family';
  if (pathname.startsWith('/hotels-in-') && pathname.split('-').length > 3) return 'district'; // Heuristic: hotels-in-paris-marais
  return 'default';
};

const getCityPageTitle = ({ variant, cityName, districtName, nearbyCityName, originCityName }) => {
  if (variant === 'best') return `Best Hotels in ${cityName} (2026) — Compare Prices`;
  if (variant === 'cheap') return `Cheap Hotels in ${cityName} (2026) — Compare Budget Deals`;
  if (variant === 'luxury') return `Luxury Hotels in ${cityName} (2026) — Compare 5-Star Stays`;
  if (variant === 'family') return `Family Hotels in ${cityName} (2026) — Kid-Friendly Stays`;
  if (variant === 'district' && districtName) return `Hotels in ${cityName} ${districtName} (2026) — Best Rates`;
  if (variant === 'nearby-from' && nearbyCityName && originCityName) return `Hotels near ${nearbyCityName} from ${originCityName} (2026)`;
  return `Best Hotels in ${cityName} (2026) — Compare Prices`;
};

const getCityPageDescription = ({ variant, cityName, districtName, nearbyCityName, originCityName }) => {
  if (variant === 'best') {
    return `Compare the best hotels in ${cityName} with real-time availability. LuxeStay shows top stays, prices, and deals across multiple providers.`;
  }
  if (variant === 'cheap') {
    return `Find cheap hotels in ${cityName} with real-time availability and deals. LuxeStay compares prices across providers so you can book the best budget stay.`;
  }
  if (variant === 'luxury') {
    return `Discover luxury hotels in ${cityName} with premium amenities and top ratings. LuxeStay compares prices across providers to help you book the best 5-star stay.`;
  }
  if (variant === 'family') {
    return `Book family hotels in ${cityName} with great locations and amenities. LuxeStay compares prices across providers to help you find kid-friendly stays and deals.`;
  }
  if (variant === 'district' && districtName) {
    return `Find the best hotels in ${cityName} ${districtName}. Compare prices, read reviews, and book your stay in this popular district with LuxeStay.`;
  }
  if (variant === 'nearby-from' && nearbyCityName && originCityName) {
    return `Planning a trip from ${originCityName} to ${nearbyCityName}? Find the best hotels near ${nearbyCityName} with real-time availability and deals.`;
  }
  return `Compare hotels in ${cityName} with real-time availability. LuxeStay shows top stays, prices, and deals across multiple providers.`;
};


const DestinationPage = () => {
  const { citySlug, districtSlug, nearbyCitySlug, type } = useParams();
  const location = useLocation();
  const variant = getCityPageVariant(location.pathname);

  // Resolution Logic
  let resolvedCitySlug = citySlug;
  let resolvedDistrictSlug = districtSlug;
  let resolvedNearbyCitySlug = nearbyCitySlug; // For "nearby-from" route, the first param is nearbyCitySlug? No, route is /hotels-near-:nearbyCitySlug-from-:citySlug
  // Wait, in /hotels-near-:nearbyCitySlug-from-:citySlug, the params are nearbyCitySlug and citySlug.
  // In /hotels-in-:citySlug-:districtSlug, we might need manual parsing if react-router doesn't split it perfectly.
  // Actually, I defined /hotels-in-:citySlug-:districtSlug. But citySlug can be multi-word?
  // If citySlug is "new-york", and district is "manhattan", url is "hotels-in-new-york-manhattan".
  // React Router will match :citySlug as "new-york-manhattan" if I am not careful, unless I have a separator?
  // No, the route was /hotels-in-:citySlug-:districtSlug. React router parses segments. But there are no slashes.
  // So "new-york-manhattan" is one segment.
  // Route /hotels-in-:citySlug will match "new-york-manhattan".
  // So I need to handle splitting INSIDE the component if I use one generic route or rely on specific order.
  // Actually, I added Route /hotels-in-:citySlug-:districtSlug. This is NOT valid react router syntax for a single segment.
  // React router parameters must be separated by characters that are not in the param.
  // If I use /hotels-in-:citySlug-:districtSlug, it expects a literal hyphen.
  // But citySlug can have hyphens. "new-york".
  // So "hotels-in-new-york-manhattan".
  // citySlug="new", districtSlug="york-manhattan"? Or citySlug="new-york", districtSlug="manhattan"?
  // It's ambiguous.
  // Better approach: Route /hotels-in-:complexSlug
  // Then parse complexSlug.
  
  // Let's rely on the fact that I know valid cities.
  const allCities = cities; // imported from data
  
  let targetCity = null;
  let targetDistrict = null;
  let targetNearbyCity = null;
  let targetOriginCity = null;

  // Handle "nearby-from" logic
  if (variant === 'nearby-from') {
     // Params should be populated if route matched /hotels-near-:nearbyCitySlug-from-:citySlug
     // Check if params exist
     const match = location.pathname.match(/\/hotels-near-(.+)-from-(.+)/);
     if (match) {
        resolvedNearbyCitySlug = match[1];
        resolvedCitySlug = match[2];
        targetNearbyCity = getCityBySlug(resolvedNearbyCitySlug);
        targetOriginCity = getCityBySlug(resolvedCitySlug);
        // The main destination is the nearby city (where we want hotels)
        targetCity = targetNearbyCity; 
     }
  } else if (variant === 'district') {
      // Try to match the slug against known cities
      // The slug comes from :citySlug in /hotels-in-:citySlug (if caught by generic)
      // OR I need to manually parse location.pathname
      const slugFromPath = location.pathname.replace('/hotels-in-', '');
      
      // Sort cities by slug length descending to match longest possible city name first
      // This prevents "saint-louis" being matched as "saint" if both exist
      const sortedCities = [...allCities].sort((a, b) => b.citySlug.length - a.citySlug.length);
      
      // Find a city that matches the start of the slug
      targetCity = sortedCities.find(c => slugFromPath.startsWith(c.citySlug));
      
      if (targetCity) {
         // Extract district
         const districtPart = slugFromPath.replace(targetCity.citySlug, '').replace(/^-/, '');
         if (districtPart) {
             targetDistrict = districtPart;
         }
      }
  } else {
      // Standard cases
      targetCity = getCityBySlug(citySlug);
  }
  
  // Fallback if targetCity is not found (maybe generic "hotels-in-paris" matched)
  if (!targetCity && citySlug) {
      targetCity = getCityBySlug(citySlug);
  }

  const resolvedCityName = targetCity?.cityName || titleCaseFromSlug(citySlug);
  const resolvedDistrictName = targetDistrict ? titleCaseFromSlug(targetDistrict) : null;
  
  const destinationConfig = targetCity || {
    citySlug,
    cityName: resolvedCityName,
    country: '',
    liteApiLocationId: null,
    query: resolvedCityName, // Fallback query
    title: `${resolvedCityName} Hotels - LuxeStay`,
    description: '',
    shortIntro: `Compare hotels in ${resolvedCityName} with real-time availability and deals.`,
    longDescription: `<p>LuxeStay helps you compare hotel prices in ${resolvedCityName} from multiple providers in real time.</p><p>Browse top-rated stays, filter by price and rating, and book through our trusted partners.</p>`,
    travelTags: ['Hotels', 'Deals', 'Compare Prices'],
    bestAreas: null,
    bestTimeToVisit: null,
    averageHotelPrice: null,
    image: '/placeholder.svg',
  };

  // If district, append to query
  if (targetDistrict) {
      destinationConfig.query = `${resolvedDistrictName}, ${destinationConfig.cityName}`;
  }
  
  // If nearby-from, query is the nearby city (already set by targetCity = targetNearbyCity)

  useEffect(() => {
    if (destinationConfig) {
      trackCityView(destinationConfig.cityName);
    }
  }, [destinationConfig]);

  const [filterPrice, setFilterPrice] = useState('all');
  const [filterRating, setFilterRating] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const hotelsGridRef = useRef(null);

  const { checkIn, checkOut, guests, rooms } = useBookingStore();

  const { hotels, loading, error, source } = useLiteApiSearch({
    destination: destinationConfig.query,
    locationId: destinationConfig.liteApiLocationId,
    checkIn,
    checkOut,
    guests,
    rooms,
    enabled: true
  });

  const filteredHotels = useMemo(() => {
    if (!hotels) return [];
    return hotels.filter(hotel => {
      // Price Logic
      if (filterPrice === 'low' && hotel.price >= 200) return false;
      if (filterPrice === 'medium' && (hotel.price < 200 || hotel.price > 500)) return false;
      if (filterPrice === 'high' && hotel.price <= 500) return false;

      // Rating Logic
      if (filterRating !== 'all' && hotel.rating < Number(filterRating)) return false;

      // Type Logic (Heuristics)
      if (filterType === 'luxury' && (hotel.rating < 4.5 || hotel.price < 300)) return false;
      if (filterType === 'boutique' && (hotel.rating < 4.0 || hotel.price > 250)) return false;
      if (filterType === 'business' && hotel.rating < 3.5) return false;
      if (filterType === 'resort' && !hotel.name.toLowerCase().includes('resort')) return false;
      if (filterType === 'family') {
        const amenities = Array.isArray(hotel.amenities) ? hotel.amenities.map((a) => String(a).toLowerCase()) : [];
        const name = String(hotel.name || '').toLowerCase();
        const familySignals = ['family', 'kids', 'kid', 'children', 'child', 'suite', 'connecting'];
        const hasSignal = familySignals.some((s) => name.includes(s) || amenities.some((a) => a.includes(s)));
        if (!hasSignal && hotel.rating < 4.0) return false;
      }

      return true;
    });
  }, [hotels, filterPrice, filterRating, filterType]);

  const topPicks = useMemo(() => {
    if (!hotels) return [];
    return [...hotels]
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.price - b.price;
      })
      .slice(0, 3);
  }, [hotels]);



  // Get other cities for internal linking
  const otherCities = cities.filter(c => c.citySlug !== citySlug).slice(0, 4);

  // Helper to strip HTML from text
  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const pageTitle = getCityPageTitle({ 
    variant, 
    cityName: destinationConfig.cityName,
    districtName: resolvedDistrictName,
    nearbyCityName: targetNearbyCity?.cityName,
    originCityName: targetOriginCity?.cityName
  });
  
  const metaDescription = getCityPageDescription({ 
    variant, 
    cityName: destinationConfig.cityName,
    districtName: resolvedDistrictName,
    nearbyCityName: targetNearbyCity?.cityName,
    originCityName: targetOriginCity?.cityName
  }).substring(0, 160);
  const pageUrl = `${SITE_ORIGIN}${location.pathname}`;
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (variant === 'cheap') {
      setFilterPrice('low');
      setFilterType('all');
      setFilterRating('all');
      return;
    }
    if (variant === 'best') {
      setFilterPrice('all');
      setFilterType('all');
      setFilterRating('all');
      return;
    }
    if (variant === 'luxury') {
      setFilterPrice('high');
      setFilterType('luxury');
      setFilterRating('4');
      return;
    }
    if (variant === 'family') {
      setFilterPrice('all');
      setFilterType('family');
      setFilterRating('4');
      return;
    }
    setFilterPrice('all');
    setFilterType('all');
    setFilterRating('all');
  }, [variant, citySlug]);

  // Auto-submit to indexing
  useIndexing(pageUrl);

  const touristDestinationSchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "name": destinationConfig.cityName,
    "description": stripHtml(destinationConfig.longDescription),
    "url": pageUrl,
    "image": destinationConfig.image,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": destinationConfig.cityName,
      "addressCountry": destinationConfig.country
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://luxestayhaven.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": pageTitle,
        "item": pageUrl
      }
    ]
  };

  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": pageTitle,
    "description": metaDescription,
    "url": pageUrl,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": (hotels || []).map((hotel, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Hotel",
          "name": hotel.name,
          "description": hotel.description,
          "image": hotel.image,
          "url": `${SITE_ORIGIN}/hotel/${hotel.liteApiId || hotel.id}?city=${citySlug || ''}`,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": destinationConfig.cityName,
            "addressCountry": destinationConfig.country
          },
          "priceRange": `$${hotel.price}`,
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": hotel.rating,
            "reviewCount": hotel.reviews
          }
        }
      }))
    },
    "hasPart": (hotels || []).map(hotel => ({
      "@type": "Hotel",
      "name": hotel.name,
      "description": hotel.description,
      "image": hotel.image,
      "url": `${SITE_ORIGIN}/hotel/${hotel.liteApiId || hotel.id}?city=${citySlug || ''}`,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": destinationConfig.cityName,
        "addressCountry": destinationConfig.country
      },
      "priceRange": `$${hotel.price}`,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": hotel.rating,
        "reviewCount": hotel.reviews
      }
    }))
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `What are the best hotels in ${destinationConfig.cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `LuxeStay compares prices from multiple providers to show the best ${destinationConfig.cityName} hotels in real time.`
        }
      },
      {
        "@type": "Question",
        "name": "Are LuxeStay prices cheaper?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, LuxeStay compares multiple booking providers to find the best available deals."
        }
      },
      {
        "@type": "Question",
        "name": `When is the best time to book hotels in ${destinationConfig.cityName}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "For the best rates, book early for peak dates and compare multiple providers. Prices can change daily based on demand and availability."
        }
      }
    ]
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": pageTitle,
    "description": metaDescription,
    "image": [destinationConfig.image],
    "datePublished": today,
    "dateModified": today,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": pageUrl
    },
    "author": {
      "@type": "Organization",
      "name": "LuxeStay"
    },
    "publisher": {
      "@type": "Organization",
      "name": "LuxeStay"
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOMetadata
        title={pageTitle}
        description={metaDescription}
        ogImage={destinationConfig.image}
        ogType="article"
        schema={[touristDestinationSchema, breadcrumbSchema, collectionPageSchema, faqSchema, articleSchema]}
      />

      <Header />      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* SEO Intro Section */}
        <div className="mb-12 max-w-4xl mx-auto text-center">
          {/* Travel Tags */}
          {destinationConfig.travelTags && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {destinationConfig.travelTags.map(tag => (
                <span key={tag} className="px-4 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {pageTitle}
          </h1>
          
          {destinationConfig.shortIntro && (
            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              {destinationConfig.shortIntro}
            </p>
          )}

          {destinationConfig.longDescription && (
            <div 
              className="text-gray-600 mb-8 [&_p]:mb-4 [&_p]:text-lg [&_p]:leading-relaxed text-left max-w-3xl mx-auto"
              dangerouslySetInnerHTML={{ __html: destinationConfig.longDescription }}
            />
          )}

          {/* SEO Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12 text-left">
            {/* Best Areas */}
            {destinationConfig.bestAreas && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-semibold text-lg text-gray-900">Best Areas to Stay</h3>
                </div>
                <ul className="space-y-3">
                  {destinationConfig.bestAreas.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-600 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Best Time to Visit */}
            {destinationConfig.bestTimeToVisit && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <Calendar className="w-5 h-5" />
                  <h3 className="font-semibold text-lg text-gray-900">Best Time to Visit</h3>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {destinationConfig.bestTimeToVisit}
                </p>
              </div>
            )}

            {/* Price Range */}
            {destinationConfig.averageHotelPrice && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <DollarSign className="w-5 h-5" />
                  <h3 className="font-semibold text-lg text-gray-900">Average Price</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {destinationConfig.averageHotelPrice}
                </p>
                <p className="text-gray-500 text-xs">
                  Prices vary by season and hotel rating. Book in advance for best rates.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Explore by Category */}
        <div className="mt-12 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Browse {destinationConfig.cityName} Hotels by Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { type: 'best', label: 'Best Hotels', icon: Trophy },
              { type: 'luxury', label: 'Luxury Hotels', icon: DollarSign },
              { type: 'budget', label: 'Budget Hotels', icon: CheckCircle },
              { type: 'family', label: 'Family Hotels', icon: ShieldCheck }
            ].map((cat) => (
              <Link
                key={cat.type}
                to={`/hotels-in/${citySlug}/${cat.type}`}
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all group"
              >
                <cat.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-gray-900 group-hover:text-primary">{cat.label}</span>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to={`/best-hotels-in-${citySlug}`} className="px-4 py-2 bg-white rounded-full border border-gray-200 text-sm hover:border-primary/30 hover:text-primary transition-colors">
              Best Hotels in {destinationConfig.cityName}
            </Link>
            <Link to={`/cheap-hotels-in-${citySlug}`} className="px-4 py-2 bg-white rounded-full border border-gray-200 text-sm hover:border-primary/30 hover:text-primary transition-colors">
              Cheap Hotels in {destinationConfig.cityName}
            </Link>
            <Link to={`/luxury-hotels-in-${citySlug}`} className="px-4 py-2 bg-white rounded-full border border-gray-200 text-sm hover:border-primary/30 hover:text-primary transition-colors">
              Luxury Hotels in {destinationConfig.cityName}
            </Link>
            <Link to={`/family-hotels-in-${citySlug}`} className="px-4 py-2 bg-white rounded-full border border-gray-200 text-sm hover:border-primary/30 hover:text-primary transition-colors">
              Family Hotels in {destinationConfig.cityName}
            </Link>
            <Link to={`/hotels-near-eiffel-tower`} className="px-4 py-2 bg-white rounded-full border border-gray-200 text-sm hover:border-primary/30 hover:text-primary transition-colors">
              Hotels Near Eiffel Tower
            </Link>
            <Link to={`/hotels-near-jfk`} className="px-4 py-2 bg-white rounded-full border border-gray-200 text-sm hover:border-primary/30 hover:text-primary transition-colors">
              Hotels Near JFK
            </Link>
          </div>
        </div>

        {/* Top Picks Section */}
        {!loading && !error && topPicks.length > 0 && (
          <div className="mb-16">
             <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-2xl font-bold text-gray-900">Top Picks in {destinationConfig.cityName}</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {topPicks.map(hotel => (
                 <HotelCard key={`pick-${hotel.id}`} hotel={hotel} variant="featured" />
               ))}
             </div>
          </div>
        )}

        {/* Filter Bar */}
        <div ref={hotelsGridRef} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 sticky top-20 z-30">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Filter className="w-5 h-5" />
              <span>Filter Hotels:</span>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <select 
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                value={filterPrice}
                onChange={(e) => setFilterPrice(e.target.value)}
              >
                <option value="all">Price: All</option>
                <option value="low">Low (&lt;$200)</option>
                <option value="medium">Medium ($200-$500)</option>
                <option value="high">High (&gt;$500)</option>
              </select>

              <select 
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
              >
                <option value="all">Rating: All</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="5">5 Stars</option>
              </select>

              <select 
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Type: All</option>
                <option value="luxury">Luxury</option>
                <option value="boutique">Boutique</option>
                <option value="business">Business</option>
                <option value="resort">Resort</option>
              </select>
            </div>
          </div>
        </div>

        {/* Popular Hotels Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {filteredHotels.length} Properties Found
            </h2>
            <p className="text-gray-600">
              Comparing prices from top booking sites
            </p>
          </div>
        </div>

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
            {filteredHotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}

        {!loading && !error && filteredHotels.length > 0 && (
          <div className="mt-8 text-center bg-blue-50 p-6 rounded-xl border border-blue-100">
             <div className="flex items-center justify-center gap-2 mb-2 text-blue-800 font-semibold">
               <ShieldCheck className="w-5 h-5" />
               <span>We compare prices from multiple partners to find you the best deal.</span>
             </div>
             <p className="text-blue-600 text-sm">No extra fees. You pay the same price as booking directly.</p>
          </div>
        )}

        {!loading && filteredHotels.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No hotels found matching your criteria in {destinationConfig.cityName}.</p>
            <button 
              onClick={() => {
                setFilterPrice('all');
                setFilterRating('all');
                setFilterType('all');
              }}
              className="mt-4 text-primary hover:underline font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Why Book Section */}
        {!loading && !error && hotels.length > 0 && (
          <div className="mt-20 max-w-4xl mx-auto bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Why book hotels in {destinationConfig.cityName}?
            </h2>
            <div className="text-gray-600 [&_p]:mb-4 [&_p]:leading-relaxed">
              <p>
                Find the best deals for {destinationConfig.cityName} hotels on LuxeStay. 
                Whether you are looking for a luxury suite, a business-friendly room, or a cozy boutique stay, 
                we offer real-time availability and competitive pricing directly from our partners.
              </p>
              <p>
                <strong>Local Tip:</strong> {destinationConfig.cityName} is best explored by foot or public transport. 
                Book a hotel near the city center to save time on commuting and spend more time soaking in the 
                local atmosphere of {destinationConfig.country}.
              </p>
            </div>
          </div>
        )}

        {/* SEO Top Hotels Section */}
        {!loading && !error && hotels.length > 0 && (
          <div className="mt-16 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Top Hotels in {destinationConfig.cityName}
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8">
              {hotels.map((hotel) => (
                <li key={`seo-${hotel.id}`}>
                  <Link 
                    to={`/hotel/${hotel.liteApiId || hotel.id}?city=${destinationConfig.citySlug}`}
                    className="text-gray-600 hover:text-primary hover:underline transition-colors block truncate text-sm"
                  >
                    {hotel.name} in {destinationConfig.cityName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Internal Linking / Other Destinations */}
        <div className="mt-20 pt-12 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Explore More Destinations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {otherCities.map((city) => (
              <Link 
                key={city.citySlug}
                to={`/hotels-in/${city.citySlug}`}
                className="group block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-gray-100"
              >
                <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors mb-1">
                  Hotels in {city.cityName}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <span className="text-xs">View Deals</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-1 group-hover:translate-x-0" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main> 

      {/* Sticky Mobile Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Best Prices</p>
            <p className="text-sm font-semibold text-gray-900">Compare {destinationConfig.cityName} hotels</p>
          </div>
          <button 
            onClick={() => hotelsGridRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-sm active:scale-95 transition-transform"
          >
            View Deals
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DestinationPage;
