import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Users, Maximize, Heart } from 'lucide-react';
import useFavoritesStore from '@/stores/useFavoritesStore';

// Create SEO-friendly slug from hotel name
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const HotelCard = ({ hotel, variant = 'default' }) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const hotelId = hotel.liteApiId || hotel.id;
  const favorited = isFavorite(hotelId);

  const handleClick = () => {
    const hotelIdParam = hotel.liteApiId || hotel.id;
    navigate(`/hotel/${hotelIdParam}`);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(hotel);
  };

  if (variant === 'featured') {
    return (
      <div
        onClick={handleClick}
        className="group card-luxury cursor-pointer"
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
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="group card-luxury cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={hotel.image}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
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
      <div className="p-5">
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-4 h-4 fill-accent text-accent" />
          <span className="text-sm font-medium">{hotel.rating}</span>
          <span className="text-sm text-muted-foreground">({hotel.reviews} reviews)</span>
        </div>
        <h3 className="font-display text-lg font-medium text-foreground mb-1 group-hover:text-accent transition-colors">
          {hotel.name}
        </h3>
        <div className="flex items-center gap-1 text-muted-foreground mb-4">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{hotel.location}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border">
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
      </div>
    </div>
  );
};

export default HotelCard;
