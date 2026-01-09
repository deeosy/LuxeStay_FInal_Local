import { useState } from 'react';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import useBookingStore from '@/stores/useBookingStore';
import { destinations } from '@/data/hotels';

const HeroSearch = () => {
  const navigate = useNavigate();
  
  // Read/write booking-critical data from global store
  const { 
    destination,
    checkIn,
    checkOut,
    guests,
    setDestination,
    setCheckIn,
    setCheckOut,
    setGuests,
  } = useBookingStore();

  // UI-only local state for dropdown visibility
  const [showDestinations, setShowDestinations] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Build SEO-friendly URL with query params
    const params = {};
    if (destination) params.destination = destination;
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests && guests !== 2) params.guests = guests.toString();
    
    navigate({
      pathname: '/search',
      search: createSearchParams(params).toString(),
    });
  };

  const selectDestination = (dest) => {
    setDestination(`${dest.name}, ${dest.country}`);
    setShowDestinations(false);
  };

  return (
    <form onSubmit={handleSearch} className="bg-card rounded-lg shadow-luxury-lg p-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Destination */}
        <div className="relative">
          <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-secondary/50 transition-colors">
            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onFocus={() => setShowDestinations(true)}
                onBlur={() => setTimeout(() => setShowDestinations(false), 200)}
                placeholder="Where to?"
                className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
          {showDestinations && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-luxury-lg border border-border z-10 animate-fade-in">
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground px-3 py-2">
                  Popular Destinations
                </p>
                {destinations.slice(0, 5).map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => selectDestination(dest)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors text-left"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{dest.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dest.country} · {dest.hotels} hotels
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Check In */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-secondary/50 transition-colors">
          <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Check In
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Check Out */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-secondary/50 transition-colors">
          <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Check Out
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Guests & Search */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-secondary/50 transition-colors flex-1">
            <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Guests
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value))}
                className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Guest' : 'Guests'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="h-full px-6 bg-accent text-accent-foreground rounded-md hover:shadow-gold transition-all duration-300 flex items-center justify-center"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default HeroSearch;
