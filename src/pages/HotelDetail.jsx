import { Link, useNavigate, useParams, createSearchParams, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
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
} from 'lucide-react';

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

  // Fetch similar hotels
  const { hotels: similarHotelsRaw, loading: loadingSimilar } = useLiteApiSearch({
    destination: searchDestination,
    enabled: !!searchDestination && !loading
  });

const getHotelKey = (h) => {
  return h?.hotelId || h?.liteApiId || h?.id || null;
};

const similarHotels = useMemo(() => {
  if (!similarHotelsRaw || !hotel) return [];

  const currentId = getHotelKey(hotel);
  if (!currentId) return [];

  return similarHotelsRaw
    .filter(h => {
      const id = getHotelKey(h);
      return id && id !== currentId;
    })
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
}, [similarHotelsRaw, hotel]);


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
    if (isDebug) {
      console.group('🐞 DEBUG: HotelDetail Redirect');
      console.log('Hotel ID:', hotel.liteApiId || hotel.id);
      console.log('City:', hotel.city || hotel.location);
      console.log('Price:', hotel.price);
      console.log('Check-in:', checkIn);
      console.log('Check-out:', checkOut);
      console.log('Guests:', guests);
      console.log('Rooms:', rooms);
      console.log('Direct Booking URL:', hotel.bookingUrl);
      
      if (hotel.bookingUrl) {
         try {
           const urlObj = new URL(hotel.bookingUrl);
           const params = urlObj.searchParams;
           console.log('--- URL Params ---');
           console.log('Full Params:', Object.fromEntries(params.entries()));
         } catch(e) { console.error(e); }
      }
      console.groupEnd();
      
      if (hotel.bookingUrl) {
          if (!window.confirm('DEBUG MODE: Redirecting to affiliate (HotelDetail). Proceed?')) {
            return;
          }
      }
    }

    // Track booking click
    trackBookingClick({
      hotel_id: hotel.liteApiId || hotel.id,
      city: hotel.city || hotel.location,
      price: hotel.price,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      rooms,
      source: 'liteapi'
    });

    // Use LiteAPI deep link if available
    if (hotel.bookingUrl) {
      trackAffiliateRedirect({
        hotel_id: hotel.liteApiId || hotel.id,
        city: hotel.city || hotel.location,
      });
      window.location.href = hotel.bookingUrl;
      return;
    }

    // Fallback for static hotels (keep existing flow for demo purposes)
    setSelectedHotel(hotel);
    
    // Navigate to checkout with URL params for refresh support
    const hotelIdForUrl = hotel.liteApiId || hotel.id;
    const params = {
      hotelId: hotelIdForUrl.toString(),
    };
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests && guests !== 2) params.guests = guests.toString();
    if (rooms && rooms !== 1) params.rooms = rooms.toString();
    
    navigate({
      pathname: '/checkout',
      search: createSearchParams(params).toString(),
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
  const pageUrl = `https://luxestayhaven.com${location.pathname}`;
  const hotelImage = hotel.image;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
         <title>{pageTitle}</title>
         <meta name="description" content={pageDescription} />
         <link rel="canonical" href={pageUrl} />
         
         <meta property="og:title" content={pageTitle} />
         <meta property="og:description" content={pageDescription} />
         <meta property="og:url" content={pageUrl} />
         <meta property="og:image" content={hotelImage} />
         <meta property="og:type" content="website" />

         {/* JSON-LD for Hotel */}
         <script type="application/ld+json">
           {JSON.stringify({
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
               "@type": "Offer",
               "url": pageUrl,
               "priceCurrency": "USD",
               "price": hotel.price,
               "availability": "https://schema.org/InStock"
             }
           })}
         </script>
         <script type="application/ld+json">
            {JSON.stringify({
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
                  "name": "Hotels",
                  "item": "https://luxestayhaven.com/search"
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": hotel.name,
                  "item": pageUrl
                }
              ]
            })}
          </script>
      </Helmet>
      <Header />

      <main className="pt-24 pb-20"> 
        <div className="container-luxury">
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
                  <HotelCard key={getHotelKey(similarHotel)} hotel={similarHotel} />
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

      <Footer />
    </div>
  );
};

export default HotelDetail;
