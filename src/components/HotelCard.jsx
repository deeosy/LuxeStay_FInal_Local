import { Link } from 'react-router-dom';
import { Star, MapPin, Users, Maximize, Heart, Check, ShieldCheck, Zap, ExternalLink } from 'lucide-react';
import useFavoritesStore from '@/stores/useFavoritesStore';

// Create SEO-friendly slug from hotel name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const HotelCard = ({ hotel, variant = 'default' }) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const hotelId = hotel.liteApiId || hotel.id;
  const favorited = isFavorite(hotelId);

  const handleFavoriteClick = (e) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    toggleFavorite(hotel);
  };

  const handleBookClick = (e) => {
    if (hotel.bookingUrl) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = hotel.bookingUrl;
    }
  };

  if (variant === 'featured') {
    return (
      <Link
        to={`/hotel/${hotelId}`}
        className="group card-luxury cursor-pointer block"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={hotel.image}
            alt={hotel.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
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
        to={`/hotel/${hotelId}`}
        className="block relative aspect-[4/3] overflow-hidden"
      >
        <img
          src={hotel.image}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
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
          <div className="price-tag">
            ${hotel.price}<span className="text-xs font-normal">/night</span>
          </div>
        </div>
      </Link>
      
      <div className="p-5 flex flex-col flex-grow">
        <Link to={`/hotel/${hotelId}`} className="block mb-2">
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="text-sm font-medium">{hotel.rating}</span>
            <span className="text-sm text-muted-foreground">({hotel.reviews} reviews)</span>
          </div>
          <h3 className="font-display text-lg font-medium text-foreground mb-1 group-hover:text-accent transition-colors line-clamp-1">
            {hotel.name}
          </h3>
          <div className="flex items-center gap-1 text-muted-foreground mb-3">
            <MapPin className="w-4 h-4" />
            <span className="text-sm line-clamp-1">{hotel.location}</span>
          </div>
        </Link>

        {/* Trust & Urgency Signals */}
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
        </div>

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
        
        {/* Affiliate Link / Call to Action */}
        <div className="mt-4 pt-3 border-t border-border">
          {hotel.bookingUrl ? (
            <a 
              href={hotel.bookingUrl}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
            >
              View Deal
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <Link 
              to={`/hotel/${hotelId}`}
              className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg font-medium hover:bg-secondary/80 transition-colors text-sm"
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
