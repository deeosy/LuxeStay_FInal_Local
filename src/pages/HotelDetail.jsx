import { Link, useNavigate, useParams, createSearchParams, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HotelCard from '@/components/HotelCard';
import { allHotels } from '@/data/hotels';
import { useLiteApiHotelDetail, useLiteApiSearch } from '@/hooks/useLiteApiHotels';
import { cities } from '@/data/cities';
import useBookingStore from '@/stores/useBookingStore';
import { trackAffiliateRedirect, trackBookingClick, trackHotelView } from '@/utils/analytics';
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
import SEOFooter from '@/components/SEOFooter';

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


// Find hotel by ID or slug in static data
const findStaticHotel = (id) => {
  const numericId = Number(id);
  if (!numericId) return null;
  return allHotels.find((h) => h.id === numericId) || null;
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

  // UI-only local state
  const [isFavorite, setIsFavorite] = useState(false);

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

  // Sync hotel to store on load
  useEffect(() => {
    if (hotel) {
      setSelectedHotel(hotel);
      trackHotelView({
        hotel_id: hotel.liteApiId || hotel.id,
        name: hotel.name,
        city: hotel.city || hotel.location,
        price: hotel.price
      });
    }
  }, [hotel, setSelectedHotel]);

  // Determine city for similar hotels
  const cityForSearch = hotel?.city || hotel?.citySlug || (hotel?.location ? hotel.location.split(',')[0] : '');

  const knownCity = cities.find(c => cityForSearch && c.cityName.toLowerCase() === cityForSearch.toLowerCase());
  const searchDestination = knownCity ? knownCity.query : cityForSearch;

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

    const filtered = similarHotelsRaw
      .filter(h => {
        const id = getHotelKey(h);
        if (shouldHideHotel(id)) return false; // Filter low performers
        return id && id !== currentId;
      });
      
    return sortHotelsByRevenue(filtered).slice(0, 3);
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

  const priceDiffPercent = cityAverage ? Math.round(((hotel.price - cityAverage) / cityAverage) * 100) : 0;
  const isGreatDeal = cityAverage && hotel.price < cityAverage;
  const isPremium = cityAverage && hotel.price > cityAverage;

  const revenueBadges = hotel ? getBadges(hotel.liteApiId || hotel.id) : [];
  const isTopConverting = revenueBadges.some(b => b.type === 'top_converting');
  
  // Loading state for LiteAPI hotels
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

const handleBookNow = () => {
  const hotelIdForUrl = hotel.liteApiId || hotel.id;

  if (isDebug) {
    console.group('DEBUG: HotelDetail Redirect');
    console.log('Hotel ID:', hotelIdForUrl);
    console.log('City:', hotel.city || hotel.location);
    console.log('Price:', hotel.price);
    console.log('Check-in:', checkIn);
    console.log('Check-out:', checkOut);
    console.log('Guests:', guests);
    console.log('Rooms:', rooms);
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

  // 👉 LITEAPI hotels MUST go through monetization
  if (hotel.liteApiId) {
    const params = new URLSearchParams({
      city: hotel.city || hotel.location || '',
      hotel: hotel.name || '',
      price: hotel.price || '',
      page: location.pathname,
      checkIn,
      checkOut,
      guests,
      rooms: rooms.toString(),
    }).toString();

    window.location.href = `/go/hotel/${hotelIdForUrl}?${params}`;
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
  const cityName = knownCity ? knownCity.cityName : (hotel.city || 'City');
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
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-full border transition-colors ${
                  isFavorite 
                    ? 'border-accent bg-accent/10 text-accent' 
                    : 'border-border hover:border-accent/50'
                }`}
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
            <div className="absolute bottom-4 right-4 price-tag text-lg">
              ${hotel.price}
              <span className="text-sm font-normal">/night</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-accent text-accent" />
                    <span className="font-medium">{hotel.rating}</span>
                  </div>
                  <span className="text-muted-foreground">
                    ({hotel.reviews} reviews)
                  </span>
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-medium mb-3">
                  {hotel.name}
                </h1>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-5 h-5" />
                  <span>{hotel.location}</span>
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
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="font-display text-3xl font-medium">
                    ${hotel.price}
                  </span>
                  <span className="text-muted-foreground">/night</span>
                </div>

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

                <button
                  onClick={handleBookNow}
                  className="w-full btn-accent text-center"
                >
                  Reserve Now
                </button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  You won't be charged yet
                </p>
              </div>
            </div>
          </div>

          {/* Similar Hotels Section */}
          {similarHotels.length > 0 && (
            <div className="mt-16 pt-12 border-t border-border">
              <h2 className="font-display text-2xl font-medium mb-8">Similar Hotels You May Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {similarHotels.map(similarHotel => (
                  <HotelCard key={getHotelKey(similarHotel)} hotel={similarHotel} cityAverage={cityAverage} />
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

      <Footer />
    </div>
  );
};

export default HotelDetail;
