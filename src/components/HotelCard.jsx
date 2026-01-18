import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Star, MapPin, Users, Maximize, Heart, Check, ShieldCheck, Zap, Flame, DollarSign, Timer, TrendingUp } from 'lucide-react';
import useFavoritesStore from '@/stores/useFavoritesStore';
import { trackAffiliateRedirect } from '@/utils/analytics';
import { useRevenueEngine } from '@/hooks/useRevenueEngine';
import PriceAnchor from '@/components/PriceAnchor';
import ScarcityBadge from '@/components/ScarcityBadge';
import UrgencyNote from '@/components/UrgencyNote';
import TrustSignal from '@/components/TrustSignal';
import BookingCTA from '@/components/BookingCTA';
import { trackAffiliateEvent } from '@/utils/affiliateEvents';

const getBookingLabel = (rating, isBudget) => {
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

const HotelCard = ({ hotel, variant = 'default', cityAverage, budgetThreshold }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isDebug = searchParams.get('debug') === 'true';
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const hotelId = hotel.liteApiId || hotel.id;

  const { getBadges } = useRevenueEngine();
  const revenueBadges = getBadges(hotelId);
  const isTopConverting = revenueBadges.some(b => b.type === 'top_converting');
  const isTryInstead = revenueBadges.some(b => b.type === 'try_instead');

  const seoCity = hotel.citySlug || hotel.city || null;
  const linkTo = seoCity 
    ? `/hotel/${hotelId}?city=${seoCity}` 
    : `/hotel/${hotelId}`;

  // Construct Affiliate Link with Tracking Params
  const currentPath = location.pathname + location.search;
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');
  const guests = searchParams.get('guests');

  const affiliateParams = new URLSearchParams({
      city: seoCity || hotel.city || '',
      hotel: hotel.name || '',
      price: hotel.price ? hotel.price.toString() : '',
      page: currentPath,
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      guests: guests || ''
  }).toString();
  
  const affiliateLink = `/go/hotel/${hotelId}?${affiliateParams}`;

  const isHighDemand = (hotel.rating || 0) >= 4.6;
  const isBestValue = cityAverage && hotel.price && hotel.price < cityAverage;
  const isLimitedRooms = cityAverage && hotel.price && hotel.price < (cityAverage * 0.8);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  let citySlugFromPath = null;
  let filterSlugFromPath = null;

  if (pathSegments[0] === 'hotels') {
    citySlugFromPath = pathSegments[1] || null;
    filterSlugFromPath = pathSegments[2] || null;
  }

  const citySlugForEvent = citySlugFromPath || hotel.citySlug || null;
  const filterSlugForEvent = filterSlugFromPath || null;

  const favorited = isFavorite(hotelId);

  useEffect(() => {
    trackAffiliateEvent({
      eventType: 'hotel_impression',
      hotelId,
      citySlug: citySlugForEvent,
      filterSlug: filterSlugForEvent,
      pageUrl: currentPath,
    });
  }, [hotelId, citySlugForEvent, filterSlugForEvent, currentPath]);

  const handleFavoriteClick = (e) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    toggleFavorite(hotel);
  };

  const handleBookClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    trackAffiliateRedirect({
      hotel_id: hotelId,
      city: seoCity || hotel.city,
      page_path: currentPath
    });

    trackAffiliateEvent({
      eventType: 'view_deal_click',
      hotelId,
      citySlug: citySlugForEvent,
      filterSlug: filterSlugForEvent,
      pageUrl: currentPath,
    });

    window.location.href = affiliateLink;
  };

  const isBudgetHotel =
    typeof budgetThreshold === 'number' &&
    hotel.price &&
    hotel.price > 0 &&
    hotel.price <= budgetThreshold;

  const primaryCity =
    hotel.city ||
    (hotel.location && typeof hotel.location === 'string'
      ? hotel.location.split(',')[0]
      : null);

  const bookingLabel = getBookingLabel(hotel.rating || 0, Boolean(isBudgetHotel));
  const priceMicrocopy = getPriceMicrocopy(
    hotel.price,
    cityAverage,
    primaryCity,
    Boolean(isBudgetHotel)
  );

  if (variant === 'featured') {
    return (
      <Link
        to={linkTo}
        className="group card-luxury cursor-pointer block"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={hotel.image}
            alt={hotel.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 z-10">
             {isTopConverting && (
                <div className="flex items-center gap-1 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm animate-pulse">
                  <TrendingUp className="w-3 h-3" /> Top Converting
                </div>
             )}
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-medium text-card">{hotel.rating}</span>
              <span className="text-sm text-card/70">({hotel.reviews})</span>
            </div>
            <h3 className="font-display text-xl font-medium text-card mb-1">
              {hotel.name}
            </h3>
            <div className="flex items-center gap-1 text-card/80">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{hotel.location}</span>
            </div>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleFavoriteClick}
              className="p-2 rounded-full bg-card/90 hover:bg-card transition-colors"
              aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                }`}
              />
            </button>
            <div className="price-tag">
              ${hotel.price}<span className="text-xs font-normal">/night</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="group card-luxury relative flex flex-col h-full">
      <Link
        to={linkTo}
        className="block relative aspect-[4/3] overflow-hidden"
      >
        <img
          src={hotel.image}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {isTopConverting && (
            <div className="flex items-center gap-1 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm animate-pulse">
              <TrendingUp className="w-3 h-3" /> Top Converting
            </div>
          )}
          {isTryInstead && (
            <div className="flex items-center gap-1 bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              <DollarSign className="w-3 h-3" /> Try This Instead
            </div>
          )}
          {isHighDemand && (
            <div className="flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              <Flame className="w-3 h-3" /> High Demand
            </div>
          )}
          {isLimitedRooms ? (
             <div className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              <Timer className="w-3 h-3" /> Limited Rooms
            </div>
          ) : isBestValue && (
            <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              <DollarSign className="w-3 h-3" /> Best Value
            </div>
          )}
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={handleFavoriteClick}
            className="p-2 rounded-full bg-card/90 hover:bg-card transition-colors z-10"
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
              }`}
            />
          </button>
          <PriceAnchor price={hotel.price} size="sm" />
        </div>
      </Link>
      
      <div className="p-5 flex flex-col flex-grow">
        <Link to={linkTo} className="block mb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{hotel.rating}</span>
              {hotel.reviews && (
                <span className="text-xs text-muted-foreground">
                  Loved by {hotel.reviews}+ travelers
                </span>
              )}
            </div>
          </div>
          <h3 className="font-display text-lg font-medium text-foreground mb-1 group-hover:text-accent transition-colors line-clamp-1">
            {hotel.name}
          </h3>
          <div className="flex items-center gap-1 text-muted-foreground mb-3">
            <MapPin className="w-4 h-4" />
            <span className="text-sm line-clamp-1">{hotel.location}</span>
          </div>
        </Link>

        <div className="flex flex-wrap gap-2 mb-4">
           <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
              <ShieldCheck className="w-3 h-3" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Best Price</span>
           </div>
           <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
              <Zap className="w-3 h-3" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Instant</span>
           </div>
           {(hotel.freeCancellation || hotel.rating >= 4.5) && (
             <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-100">
                <Check className="w-3 h-3" />
                <span className="text-[10px] font-medium uppercase tracking-wide">Free Cancel</span>
             </div>
           )}
           <ScarcityBadge hotel={hotel} />
        </div>
        <TrustSignal className="mb-3" />

        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-3 border-t border-border mt-auto">
          {hotel.sqft && (
            <div className="flex items-center gap-1">
              <Maximize className="w-4 h-4" />
              <span>{hotel.sqft} sq ft</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{hotel.guests || 2} guests</span>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-border">
          <BookingCTA
            href={affiliateLink}
            onClick={handleBookClick}
            label={bookingLabel}
          />
          {priceMicrocopy && (
            <p className="mt-2 text-xs text-muted-foreground">
              {priceMicrocopy}
            </p>
          )}
          <UrgencyNote hasFreeCancellation={Boolean(hotel.freeCancellation)} />
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
