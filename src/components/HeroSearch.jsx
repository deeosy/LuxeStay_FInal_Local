import { useState } from 'react';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Minus, Plus, ChevronDown } from 'lucide-react';
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
    rooms,
    setDestination,
    setCheckIn,
    setCheckOut,
    setGuests,
    setRooms,
  } = useBookingStore();

  // UI-only local state for dropdown visibility
  const [showDestinations, setShowDestinations] = useState(false);
  const [isRoomConfigOpen, setIsRoomConfigOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Build SEO-friendly URL with query params
    const params = {};
    if (destination) params.destination = destination;
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests && guests !== 2) params.guests = guests.toString();
    if (rooms && rooms !== 1) params.rooms = rooms.toString();
    
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
      <div className="flex flex-col md:flex-row items-center gap-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Destination */}
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-secondary/50 transition-colors">
              <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 hidden sm:block" />
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
                      <MapPin className="w-4 h-4 text-muted-foreground hidden sm:block" />
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
            <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 hidden sm:block" />
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
            <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 hidden sm:block" />
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

          {/* Rooms & Guests Configuration & Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-secondary/50 transition-colors">
                <Users className="w-5 h-5 text-muted-foreground flex-shrink-0 hidden sm:block" />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Rooms & Guests
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRoomConfigOpen(!isRoomConfigOpen)}
                    className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none flex items-center justify-between"
                  >
                    <span className="truncate">
                      {rooms} Room{rooms > 1 ? 's' : ''}, {guests} Guest{guests > 1 ? 's' : ''}
                    </span>
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isRoomConfigOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Room Config Popover */}
              {isRoomConfigOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsRoomConfigOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 p-4 bg-card border border-border rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200 w-[280px]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-sm">Configuring Rooms</h3>
                      <button 
                        type="button"
                        onClick={() => setIsRoomConfigOpen(false)}
                        className="text-xs text-accent hover:underline"
                      >
                        Done
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Rooms Counter */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rooms</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setRooms(Math.max(1, rooms - 1))}
                            disabled={rooms <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-medium">{rooms}</span>
                          <button
                            type="button"
                            onClick={() => setRooms(Math.min(10, rooms + 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-secondary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Guests Counter */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Guests</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setGuests(Math.max(1, guests - 1))}
                            disabled={guests <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-medium">{guests}</span>
                          <button
                            type="button"
                            onClick={() => setGuests(Math.min(20, guests + 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-secondary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
          </div>
        </div>
        <button
          type="submit"
          className="h-12 w-full md:w-auto md:ml-6 px-3 bg-accent text-accent-foreground rounded-md hover:shadow-gold transition-all duration-300 flex items-center justify-center"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};

export default HeroSearch;
