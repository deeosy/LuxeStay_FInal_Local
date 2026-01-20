import { Link, useNavigate, useParams, createSearchParams, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HotelCard from '@/components/HotelCard';
import { allHotels } from '@/data/hotels';
import { useLiteApiHotelDetail, useLiteApiSearch } from '@/hooks/useLiteApiHotels';
import { cities } from '@/data/cities';
import useBookingStore from '@/stores/useBookingStore';
import { trackAffiliateRedirect, trackBookingClick, trackHotelView } from '@/utils/analytics';
import { trackAffiliateEvent } from '@/utils/affiliateEvents';
import { useSavedHotelIds } from '@/hooks/useSavedHotelIds';
import useAuthStore from '@/stores/useAuthStore';
import {
  Star,
  MapPin,
  Maximize,
  Users,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Waves,
  Heart,
  Share2,
  ChevronLeft,
  Check,
  Loader2,
  TrendingUp,
  ArrowRightCircle
} from 'lucide-react';
import SEOMetadata from '@/components/seo/SEOMetadata';
import { useIndexing } from '@/hooks/useIndexing';
import { useRevenueEngine } from '@/hooks/useRevenueEngine';
import { useHotelPriceTracking } from '@/hooks/useHotelPriceTracking';
import SEOFooter from '@/components/SEOFooter';
import PriceAnchor from '@/components/PriceAnchor';
import ScarcityBadge from '@/components/ScarcityBadge';
import UrgencyNote from '@/components/UrgencyNote';
import TrustSignal from '@/components/TrustSignal';
import ExitIntentModal from '@/components/ExitIntentModal';
import BookingCTA from '@/components/BookingCTA';
import CompareAlternatives from '@/components/CompareAlternatives';

const facilityIcons = {
  Spa: Waves,
  Pool: Waves,
  'Private Pool': Waves,
  'Rooftop Pool': Waves,
  Gym: Dumbbell,
  'Fitness Center': Dumbbell,
  Restaurant: Coffee,
  'Fine Dining': Coffee,
  'Michelin Restaurant': Coffee,
  'Kaiseki Dining': Coffee,
  Bar: Coffee,
  Wifi: Wifi,
  'Ski Access': Car,
  'Butler Service': Users,
  Concierge: Users,
};


const findStaticHotel = (id) => {
  const numericId = Number(id);
  if (!numericId) return null;
  return allHotels.find((h) => h.id === numericId) || null;
};



const getBookingLabel = (rating, isBudget, price) => {
  if (!price) return 'Check Availability';
  if (isBudget) return 'View Cheapest Option';
  if (rating >= 4.5) return 'View Best Rated Deal';
  return 'View Best Deal';
};

const getPriceMicrocopy = (price, average, city, isBudget) => {
  if (!price || !average) return null;
  if (isBudget) return 'One of the better-priced hotels in this area';
  if (price < average) {
    if (city) return `Great value for stays in ${city}`;
    return 'Great value compared with similar stays';
  }
  return 'Priced similarly to other stays in this area';
};



const HotelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const pageUrl = `https://luxestayhaven.com${location.pathname}`;
  // Auto-submit to indexing
  useIndexing(pageUrl);

  const isDebug = searchParams.get('debug') === 'true';
  const citySlugFromParams = searchParams.get('city');
  
  // Read booking state from global store
  const { 
    checkIn, 
    checkOut, 
    guests,
    rooms,
    setCheckIn,
    setCheckOut,
    setGuests,
    setSelectedHotel,
    getNights,
  } = useBookingStore();

  const { getBadges, getBetterAlternative, shouldHideHotel, sortHotelsByRevenue } = useRevenueEngine();

  // Auth & Saved Hotels
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const { isHotelSaved, toggleHotelSaved } = useSavedHotelIds();
  const [isToggling, setIsToggling] = useState(false);
  const impressionFired = useRef(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [canShowExit, setCanShowExit] = useState(false);
  const { recordPrice } = useHotelPriceTracking();

  // Check for static hotel first
  const staticHotel = findStaticHotel(id);
  const isLiteApiHotel = !staticHotel;

  // Fetch from LiteAPI if not a static hotel
  const { hotel: liteApiHotel, loading, error, source } = useLiteApiHotelDetail({
    hotelId: id,
    checkIn,
    checkOut,
    guests,
    rooms,
    enabled: isLiteApiHotel,
  });

  // Use static hotel or LiteAPI hotel
  const hotel = staticHotel || liteApiHotel;
  const hotelId = hotel?.liteApiId || hotel?.id;
  const isFavorite = isHotelSaved(hotelId);

  const handleFavoriteClick = async () => {
    if (isToggling) return;

    if (!initialized || !user) {
      navigate('/login');
      return;
    }

    setIsToggling(true);
    const startTime = Date.now();

    const { error } = await toggleHotelSaved(hotelId);

    const elapsed = Date.now() - startTime;
    const remaining = 500 - elapsed;
    if (remaining > 0) {
      await new Promise(r => setTimeout(r, remaining));
    }
    setIsToggling(false);
  };

  useEffect(() => {
    if (hotel) {
      setSelectedHotel(hotel);
      trackHotelView({
        hotel_id: hotel.liteApiId || hotel.id,
        name: hotel.name,
        city: hotel.city || hotel.location,
        price: hotel.price
      });

      const hotelIdForEvent = hotel.liteApiId || hotel.id;

      if (hotelIdForEvent) {
        trackAffiliateEvent({
          eventType: 'hotel_impression',
          hotelId: hotelIdForEvent,
          citySlug: citySlugFromParams || hotel.citySlug || null,
          filterSlug: null,
          pageUrl: `${location.pathname}${location.search}`,
        });
        impressionFired.current = true;

        // Step 83: Record price for history
        if (hotel.price) {
          recordPrice(hotelIdForEvent, hotel.price);
        }
      }
    }
  }, [hotel, setSelectedHotel, citySlugFromParams, location, recordPrice]);

  // Determine city for similar hotels
  const cityForSearch = hotel?.city || hotel?.citySlug || (hotel?.location ? hotel.location.split(',')[0] : '');

  const knownCity = cities.find(c => cityForSearch && c.cityName.toLowerCase() === cityForSearch.toLowerCase());
  const searchDestination = knownCity ? knownCity.query : cityForSearch;
  
  const cityName = knownCity ? knownCity.cityName : (hotel?.city || 'City');

  // ✅ Corrected Logic: Prioritize LiteAPI ID, fallback to destination string
  const similarSearchParams = useMemo(() => {
    if (!hotel) return { enabled: false };
      // Use the ID if we have it (most accurate), otherwise use text search
    if (knownCity?.liteApiLocationId) {
      return { 
        locationId: knownCity.liteApiLocationId,
        enabled: !!searchDestination && !loading 
      };
    }

    return { 
      destination: searchDestination,
      enabled: !!searchDestination && !loading 
    };
  }, [hotel, knownCity, searchDestination, loading]);

  // Fetch similar hotels using the refined params
  const { hotels: similarHotelsRaw, loading: loadingSimilar } = useLiteApiSearch(similarSearchParams);


  const getHotelKey = (h) => {
    return h?.hotelId || h?.liteApiId || h?.id || null;
  };

  const similarHotels = useMemo(() => {
    if (!similarHotelsRaw || !hotel) return [];

    const currentId = getHotelKey(hotel);
    if (!currentId) return [];

    const filtered = similarHotelsRaw.filter(h => {
      const id = getHotelKey(h);
      if (shouldHideHotel(id)) return false;
      return id && id !== currentId;
    });

    const byPrice = filtered.filter(h => {
      if (!hotel.price || !h.price) return true;
      const diff = Math.abs(h.price - hotel.price) / hotel.price;
      return diff <= 0.15;
    });

    const candidates = byPrice.length > 0 ? byPrice : filtered;
    return sortHotelsByRevenue(candidates).slice(0, 3);
  }, [similarHotelsRaw, hotel, shouldHideHotel, sortHotelsByRevenue]);

  const betterAlternative = useMemo(() => {
    if (!hotel || !similarHotelsRaw) return null;
    const currentId = getHotelKey(hotel);
    return getBetterAlternative(currentId, similarHotelsRaw);
  }, [hotel, similarHotelsRaw, getBetterAlternative]);

  // Price Psychology Logic
  const cityAverage = useMemo(() => {
    if (!similarHotels || similarHotels.length === 0) return null;
    const total = similarHotels.reduce((acc, h) => acc + (h.price || 0), 0);
    return Math.round(total / similarHotels.length);
  }, [similarHotels]);

  const budgetThreshold = useMemo(() => {
    const samples = [];
    if (hotel?.price && hotel.price > 0) {
      samples.push(hotel.price);
    }
    if (similarHotels && similarHotels.length > 0) {
      similarHotels.forEach(h => {
        if (h.price && h.price > 0) {
          samples.push(h.price);
        }
      });
    }
    if (!samples.length) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const index = Math.floor((sorted.length - 1) * 0.3);
    return sorted[index];
  }, [hotel, similarHotels]);

  const priceDiffPercent =
    cityAverage && hotel?.price
      ? Math.round(((hotel.price - cityAverage) / cityAverage) * 100)
      : 0;
  const isGreatDeal = Boolean(cityAverage && hotel?.price && hotel.price < cityAverage);
  const isPremium = Boolean(cityAverage && hotel?.price && hotel.price > cityAverage);
  const isBudgetHotel =
    budgetThreshold && hotel?.price && hotel.price > 0 && hotel.price <= budgetThreshold;

  const revenueBadges = hotel ? getBadges(hotel.liteApiId || hotel.id) : [];
  const isTopConverting = revenueBadges.some(b => b.type === 'top_converting');
  const bookingLabel = getBookingLabel(hotel?.rating || 0, Boolean(isBudgetHotel), hotel?.price);
  const priceMicrocopy = getPriceMicrocopy(
    hotel?.price,
    cityAverage,
    cityName,
    Boolean(isBudgetHotel)
  );

  useEffect(() => {
    const timer = setTimeout(() => setCanShowExit(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hotel || !hotel.liteApiId) return;

    const exitKey = `exit_shown_${hotel.liteApiId}`;
    const clickedKey = `exit_clicked_${hotel.liteApiId}`;

    const handleMouseOut = (event) => {
      if (event.clientY > 0) return;
      if (window.innerWidth < 1024) return;
      if (!canShowExit) return;

      const hasShownExit = sessionStorage.getItem(exitKey);
      const hasClicked = sessionStorage.getItem(clickedKey);
      if (hasShownExit || hasClicked) return;

      sessionStorage.setItem(exitKey, '1');

      const hotelIdForEvent = hotel.liteApiId || hotel.id;

      if (hotelIdForEvent) {
        trackAffiliateEvent({
          eventType: 'exit_intent_view',
          hotelId: hotelIdForEvent,
          citySlug: citySlugFromParams || hotel.citySlug || null,
          filterSlug: null,
          pageUrl: `${location.pathname}${location.search}`,
        });
      }

      setShowExitIntent(true);
    };

    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [hotel, canShowExit, citySlugFromParams, location]);

  if (isLiteApiHotel && loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading hotel details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-20 text-center">
          <h1 className="text-2xl font-medium mb-4">Hotel not found</h1>
          <Link to="/search" className="btn-primary">
            Back to Search
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

// Affiliate Logic
  const affiliateParams = useMemo(() => {
     if (!hotel?.liteApiId) return '';
     return new URLSearchParams({
      city: hotel.city || hotel.location || 'unknown',
      hotel: hotel.name || 'hotel',
      price: hotel.price ? hotel.price.toString() : '0',
      page: location.pathname,
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      guests: guests ? guests.toString() : '',
      rooms: rooms ? rooms.toString() : '',
    }).toString();
  }, [hotel, location.pathname, checkIn, checkOut, guests, rooms]);

  const affiliateLink = hotel?.liteApiId ? `/go/hotel/${hotelId}?${affiliateParams}` : null;

  const handleBookNow = () => {
    const hotelIdForUrl = hotel.liteApiId || hotel.id;

    if (typeof window !== 'undefined' && hotel.liteApiId) {
      const clickedKey = `exit_clicked_${hotel.liteApiId}`;
      sessionStorage.setItem(clickedKey, '1');
    }

    if (isDebug) {
      console.group('DEBUG: HotelDetail Redirect');
      console.log('Hotel ID:', hotelIdForUrl);
      console.log('City:', hotel.city || hotel.location);
      console.log('Price:', hotel.price);
      console.log('Direct Booking URL:', hotel.bookingUrl);
      console.groupEnd();

      if (!window.confirm('DEBUG MODE: Continue redirect?')) {
        return;
      }
    }

    trackBookingClick({
      hotel_id: hotelIdForUrl,
      city: hotel.city || hotel.location,
      price: hotel.price,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      rooms,
      source: hotel.liteApiId ? 'liteapi' : 'static'
    });

    if (process.env.NODE_ENV === 'development') {
      if (!hotelIdForUrl || (!hotel.city && !hotel.location)) {
         console.warn('[Telemetry Warning] Missing critical tracking data:', { hotelId: hotelIdForUrl, city: hotel.city || hotel.location });
      }
      if (!impressionFired.current) {
         console.warn('[Telemetry Warning] Affiliate redirect fired without impression event:', { hotelId: hotelIdForUrl });
      }
    }

    trackAffiliateEvent({
      eventType: 'view_deal_click',
      hotelId: hotelIdForUrl,
      citySlug: citySlugFromParams || hotel.citySlug || null,
      filterSlug: null,
      pageUrl: `${location.pathname}${location.search}`,
    });

    // 👉 LITEAPI hotels: Browser handles the <a> tag navigation (affiliateLink)
    // We only need to handle navigation for static hotels here.
    if (hotel.liteApiId) {
      return;
    }

    // 👉 Static hotels go to checkout
    setSelectedHotel(hotel);

    const checkoutParams = {
      hotelId: hotelIdForUrl.toString(),
    };
    if (checkIn) checkoutParams.checkIn = checkIn;
    if (checkOut) checkoutParams.checkOut = checkOut;
    if (guests && guests !== 2) checkoutParams.guests = guests.toString();
    if (rooms && rooms !== 1) checkoutParams.rooms = rooms.toString();

    navigate({
      pathname: '/checkout',
      search: createSearchParams(checkoutParams).toString(),
    });
  };


  // Calculate nights from global store dates
  const nights = getNights();
  const subtotal = hotel.price * nights;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;

  // Limit guest selection to hotel capacity
  const maxGuests = hotel.guests;

  // Internal Linking Logic
  // cityName is already defined above
  const citySlug = knownCity ? knownCity.citySlug : null;
  const nearbyCities = cities
    .filter(c => c.citySlug !== citySlug)
    .slice(0, 3);

  const pageTitle = `${hotel.name} - Book Now | LuxeStay`;
  const pageDescription = hotel.description 
    ? hotel.description.substring(0, 160) 
    : `Book your stay at ${hotel.name} in ${hotel.city || hotel.location}. Best rates guaranteed.`;

  const hotelImage = hotel.image;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const priceValidUntil = tomorrow.toISOString().split('T')[0];
  
  const minPrice = similarHotels.length > 0 ? Math.min(hotel.price, ...similarHotels.map(h => h.price || Infinity)) : hotel.price;
  const maxPrice = similarHotels.length > 0 ? Math.max(hotel.price, ...similarHotels.map(h => h.price || -Infinity)) : hotel.price;

  const hotelSchema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "url": pageUrl,
    "name": hotel.name,
    "description": hotel.description,
    "image": hotelImage,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": hotel.city || hotel.location,
      "addressCountry": hotel.country || ""
    },
    "priceRange": `$${hotel.price}`,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": hotel.rating,
      "reviewCount": hotel.reviews || 0
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": minPrice,
      "highPrice": maxPrice,
      "offerCount": similarHotels.length + 1,
      "offers": [
        {
          "@type": "Offer",
          "url": pageUrl,
          "priceCurrency": "USD",
          "price": hotel.price,
          "priceValidUntil": priceValidUntil,
          "availability": "https://schema.org/InStock"
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOMetadata
        title={pageTitle}
        description={pageDescription}
        ogImage={hotelImage}
        ogType="website"
        schema={hotelSchema}
      />
      <Header />

      <main className="pt-24 pb-20"> 
        <div className="container-luxury">
          {/* Better Alternative Banner (Revenue Optimization) */}
          {betterAlternative && (
            <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-full text-green-700">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">💰 Better Value Available</h3>
                  <p className="text-green-800 text-sm">
                    <span className="font-bold">{betterAlternative.name}</span> is trending with travelers right now.
                  </p>
                </div>
              </div>
              <Link to={`/hotel/${betterAlternative.hotelId || betterAlternative.liteApiId || betterAlternative.id}`} className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap">
                Check Deal <ArrowRightCircle className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Breadcrumb & Actions */}
          <div className="flex items-center justify-between mb-6">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <span>/</span>
              <Link to="/search" className="hover:text-foreground transition-colors">
                Hotels
              </Link>
              <span>/</span>
              <span className="text-foreground">{hotel.name}</span>
            </nav>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleFavoriteClick}
                disabled={isToggling}
                className={`p-2 rounded-full border transition-colors ${
                  isFavorite 
                    ? 'border-accent bg-accent/10 text-accent' 
                    : 'border-border hover:border-accent/50'
                } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!user ? "Sign in to save hotels" : isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 rounded-full border border-border hover:border-accent/50 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Image */}
          <div className="relative aspect-[21/9] rounded-xl overflow-hidden mb-8">
            <img
              src={hotel.image}
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 right-4">
              <PriceAnchor price={hotel.price} size="lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-accent text-accent" />
                    <span className="font-medium">{hotel.rating}</span>
                  </div>
                  {hotel.reviews && (
                    <span className="text-sm text-muted-foreground">
                      ⭐ {hotel.rating} — Loved by {hotel.reviews}+ travelers
                    </span>
                  )}
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-medium mb-3">
                  {hotel.name}
                </h1>
                <div className="flex flex-col gap-1 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-5 h-5" />
                    <span>{hotel.location}</span>
                  </div>
                  <TrustSignal />
                </div>
              </div>

              {/* Price Psychology Badges */}
              {cityAverage && (
                <div className="mb-8 flex flex-wrap items-center gap-3">
                   {isTopConverting && (
                     <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
                       <TrendingUp className="w-4 h-4" /> Top Converting Hotel
                     </div>
                   )}
                   {isGreatDeal && (
                     <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                       <Check className="w-4 h-4" /> Great Deal
                     </div>
                   )}
                   {isPremium && (
                     <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                       <Star className="w-4 h-4" /> Premium Stay
                     </div>
                   )}
                   <span className="text-sm text-muted-foreground">
                     {priceDiffPercent < 0 
                        ? `This hotel is ${Math.abs(priceDiffPercent)}% cheaper than similar hotels in ${cityName}`
                        : `This hotel is ${priceDiffPercent}% more expensive than similar hotels in ${cityName}`
                     }
                   </span>
                </div>
              )}

              {/* Quick Info */}
              <div className="flex flex-wrap gap-6 pb-8 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Maximize className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{hotel.sqft} sq ft</p>
                    <p className="text-xs text-muted-foreground">Room Size</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{hotel.guests} Guests</p>
                    <p className="text-xs text-muted-foreground">Max Capacity</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-accent font-medium">{hotel.beds}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{hotel.beds} Bed{hotel.beds > 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="py-8 border-b border-border">
                <h2 className="font-display text-xl font-medium mb-4">
                  About This Property
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {hotel.description}
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Experience unparalleled luxury at {hotel.name}. This exquisite property
                  offers a perfect blend of comfort, elegance, and world-class service.
                  Whether you're seeking a romantic getaway, a family vacation, or a
                  business retreat, our dedicated staff ensures every moment of your stay
                  is nothing short of extraordinary.
                </p>
              </div>

              {/* Facilities */}
              <div className="py-8">
                <h2 className="font-display text-xl font-medium mb-6">
                  Amenities & Services
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {hotel.amenities.map((facility, index) => {
                    const name = typeof facility === "string" ? facility : facility.name;
                    const Icon = facilityIcons[name] || Check;

                    return (
                      <div
                        key={`${name}-${index}`}
                        className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50"
                      >
                        <Icon className="w-5 h-5 text-accent" />
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 bg-card border border-border rounded-xl p-6 shadow-luxury-md">
                <PriceAnchor price={hotel.price} size="lg" className="mb-2" />
                <ScarcityBadge hotel={hotel} className="mt-1" />

                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Check In
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Check Out
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Guests
                    </label>
                    <select
                      value={Math.min(guests, maxGuests)}
                      onChange={(e) => setGuests(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                    >
                      {Array.from({ length: maxGuests }, (_, i) => i + 1).map(
                        (num) => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? 'Guest' : 'Guests'}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 py-4 border-t border-b border-border mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ${hotel.price} x {nights} night{nights > 1 ? 's' : ''}
                    </span>
                    <span>${subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service fee</span>
                    <span>${serviceFee}</span>
                  </div>
                </div>

                <div className="flex justify-between font-medium mb-6">
                  <span>Total</span>
                  <span className="text-lg">${total}</span>
                </div>

                <BookingCTA
                  href={affiliateLink || undefined}
                  onClick={handleBookNow}
                  label={bookingLabel}
                  size="lg"
                />
                {priceMicrocopy && (
                  <p className="mt-2 text-xs text-muted-foreground text-center">
                    {priceMicrocopy}
                  </p>
                )}
                {similarHotels.length > 0 && (
                  <CompareAlternatives cityName={cityName} />
                )}
                <UrgencyNote
                  hasFreeCancellation={Boolean(hotel.freeCancellation)}
                  className="text-center"
                />
              </div>
            </div>
          </div>

          {/* Similar Hotels Section */}
          {similarHotels.length > 0 && (
            <div className="mt-16 pt-12 border-t border-border" id="similar-hotels">
              <h2 className="font-display text-2xl font-medium mb-8">Similar Hotels You May Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {similarHotels.map(similarHotel => (
                  <HotelCard
                    key={getHotelKey(similarHotel)}
                    hotel={similarHotel}
                    cityAverage={cityAverage}
                    budgetThreshold={budgetThreshold}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Internal Linking / Explore More Section */}
          <div className="mt-16 pt-12 border-t border-border">
            <h2 className="font-display text-2xl font-medium mb-6">Explore more hotels in {cityName}</h2>
            <div className="flex flex-wrap gap-4">
              {citySlug && (
                <Link 
                  to={`/hotels-in/${citySlug}`}
                  className="px-4 py-2 bg-secondary rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Hotels in {cityName}
                </Link>
              )}
              {nearbyCities.map(city => (
                <Link 
                  key={city.citySlug}
                  to={`/hotels-in/${city.citySlug}`}
                  className="px-4 py-2 bg-secondary rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Hotels in {city.cityName}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* SEO Footer for internal linking */}
      {knownCity && <SEOFooter currentCity={knownCity} currentHotel={hotel} />}

      <ExitIntentModal
        open={showExitIntent && Boolean(hotel.liteApiId)}
        onViewDeal={() => {
          const hotelIdForEvent = hotel.liteApiId || hotel.id;

          if (hotelIdForEvent) {
            trackAffiliateEvent({
              eventType: 'exit_intent_click',
              hotelId: hotelIdForEvent,
              citySlug: citySlugFromParams || hotel.citySlug || null,
              filterSlug: null,
              pageUrl: `${location.pathname}${location.search}`,
            });
          }

          setShowExitIntent(false);
          handleBookNow();
        }}
        onDismiss={() => setShowExitIntent(false)}
      />

      <Footer />
    </div>
  );
};

export default HotelDetail;
