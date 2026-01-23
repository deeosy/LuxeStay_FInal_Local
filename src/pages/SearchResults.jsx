import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, createSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HotelCard from '@/components/HotelCard';
import { allHotels, destinations } from '@/data/hotels';
import { cities } from '@/data/cities';
import { useLiteApiSearch } from '@/hooks/useLiteApiHotels';
import { useSavedHotelIds } from '@/hooks/useSavedHotelIds';
import useBookingStore from '@/stores/useBookingStore';
import { useRevenueEngine } from '@/hooks/useRevenueEngine';
import { Search, SlidersHorizontal, MapPin, X, Calendar, Users, Loader2, Wifi, Waves, Sparkles, Dumbbell, Utensils, Car, Wind, Coffee, Minus, Plus, ChevronDown } from 'lucide-react';
import SessionDealReminder from '@/components/SessionDealReminder';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { shouldHideHotel, sortHotelsByRevenue } = useRevenueEngine();

  // Read booking-critical data from global store
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
    setSearchParams: setStoreParams,
  } = useBookingStore();

  // UI-only local state for filters and visual controls
  const [searchQuery, setSearchQuery] = useState('');
  const [isRoomConfigOpen, setIsRoomConfigOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 3000]);
  const [selectedRating, setSelectedRating] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Available amenity filters
  const amenityFilters = [
    { id: 'wifi', label: 'WiFi', icon: Wifi, keywords: ['wifi', 'internet', 'wireless'] },
    { id: 'pool', label: 'Pool', icon: Waves, keywords: ['pool', 'swimming'] },
    { id: 'spa', label: 'Spa', icon: Sparkles, keywords: ['spa', 'wellness', 'massage'] },
    { id: 'gym', label: 'Gym', icon: Dumbbell, keywords: ['gym', 'fitness', 'workout'] },
    { id: 'restaurant', label: 'Restaurant', icon: Utensils, keywords: ['restaurant', 'dining', 'food'] },
    { id: 'parking', label: 'Parking', icon: Car, keywords: ['parking', 'valet'] },
    { id: 'ac', label: 'A/C', icon: Wind, keywords: ['air conditioning', 'ac', 'climate'] },
    { id: 'breakfast', label: 'Breakfast', icon: Coffee, keywords: ['breakfast', 'brunch'] },
  ];

  // On mount: Read URL params and sync to store (for direct URL access / refresh)
  useEffect(() => {
    const urlDestination = searchParams.get('destination') || '';
    const urlCheckIn = searchParams.get('checkIn') || '';
    const urlCheckOut = searchParams.get('checkOut') || '';
    const urlGuests = parseInt(searchParams.get('guests')) || 2;
    const urlRooms = parseInt(searchParams.get('rooms')) || 1;

    // Update store from URL params
    setStoreParams({
      destination: urlDestination || destination,
      checkIn: urlCheckIn || checkIn,
      checkOut: urlCheckOut || checkOut,
      guests: urlGuests || guests,
      rooms: urlRooms || rooms,
    });

    // Set local search query from URL or store
    setSearchQuery(urlDestination || destination || '');
    setIsInitialized(true);
  }, []); // Only on mount

  // Update URL when store values change (after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const params = {};
    if (destination) params.destination = destination;
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests && guests !== 2) params.guests = guests.toString();
    if (rooms && rooms !== 1) params.rooms = rooms.toString();

    navigate({
      pathname: '/search',
      search: createSearchParams(params).toString(),
    }, { replace: true });
  }, [destination, checkIn, checkOut, guests, rooms, isInitialized]);

  // Sync local search query with global destination
  useEffect(() => {
    if (isInitialized && destination !== searchQuery) {
      setSearchQuery(destination || '');
    }
  }, [destination, isInitialized]);

  // Update global store when local search query changes (debounced)
  useEffect(() => {
    if (!isInitialized) return;
    const timeoutId = setTimeout(() => {
      if (searchQuery !== destination) {
        setDestination(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isInitialized]);

  // const matchedCity = useMemo(() => {
  //   if (!searchQuery) return null;
  //   return cities.find(
  //     c => c.cityName.toLowerCase() === searchQuery.toLowerCase()
  //   );
  // }, [searchQuery]);

  // const fuzzyCityMatch = useMemo(() => {
  //   if (!searchQuery) return null;
  //   return cities.find(c =>
  //     c.cityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     searchQuery.toLowerCase().includes(c.cityName.toLowerCase())
  //   );
  // }, [searchQuery]);
  // const resolvedCity = matchedCity || fuzzyCityMatch;

  //   const liteSearchParams = useMemo(() => {
  //   if (!isInitialized) return { enabled: false };


  //   if (resolvedCity?.liteApiLocationId) {
  //     return {
  //       locationId: resolvedCity.liteApiLocationId,
  //       checkIn,
  //       checkOut,
  //       guests,
  //       enabled: true,
  //     };
  //   }



  //   return {
  //     enabled: false // wait until we resolve a city
  //   };
  // }, [matchedCity, searchQuery, checkIn, checkOut, guests, isInitialized]);

  // ✅ All hooks at top level — correct order preserved
const matchedCity = useMemo(() => {
  if (!searchQuery) return null;
  return cities.find(
    c => c.cityName.toLowerCase() === searchQuery.toLowerCase()
  );
}, [searchQuery]);

const fuzzyCityMatch = useMemo(() => {
  if (!searchQuery || matchedCity) return null;
  return cities.find(c =>
    c.cityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    searchQuery.toLowerCase().includes(c.cityName.toLowerCase())
  );
}, [searchQuery, matchedCity]);

const resolvedCity = matchedCity || fuzzyCityMatch;

const liteSearchParams = useMemo(() => {
  if (!isInitialized) return { enabled: false };

  console.log('Search Params Debug:', { 
    resolvedCity: resolvedCity?.cityName, 
    liteApiLocationId: resolvedCity?.liteApiLocationId,
    destination,
    searchQuery 
  });

  if (resolvedCity?.liteApiLocationId) {
    return {
      locationId: resolvedCity.liteApiLocationId,
      checkIn,
      checkOut,
      guests,
      enabled: true,
    };
  }

  // Fallback to text-based search if we have a destination
  const targetDestination = resolvedCity ? `${resolvedCity.cityName}, ${resolvedCity.country}` : destination || searchQuery;  
  if (targetDestination) {
    return {
      destination: targetDestination,
      checkIn,
      checkOut,
      guests,
      enabled: true,
    };
  }

  return { enabled: false };
}, [resolvedCity, destination, searchQuery, checkIn, checkOut, guests, rooms, isInitialized]);

  const { hotels: liteApiHotels, loading: liteApiLoading, error: liteApiError, source } =
  useLiteApiSearch(liteSearchParams);
  
  const { isHotelSaved } = useSavedHotelIds();


  const filteredHotels = useMemo(() => {
    // Use LiteAPI results (or empty if none found)
    let results = [...liteApiHotels];

    console.log('Filtering hotels. Initial count:', results.length, 'Source:', source);

    if (searchQuery && source?.includes('static')) {
      const query = searchQuery.toLowerCase();
      results = results.filter((hotel) => {
        const name = (hotel.name || '').toLowerCase();
        const location = (hotel.location || hotel.city || '').toLowerCase();
        return name.includes(query) || location.includes(query);
      });
    }

    // Filter by price
    results = results.filter(
      (hotel) => hotel.price >= priceRange[0] && hotel.price <= priceRange[1]
    );

    // Sort: Saved hotels first, then by price
    results.sort((a, b) => {
      const aSaved = isHotelSaved(a.liteApiId || a.id);
      const bSaved = isHotelSaved(b.liteApiId || b.id);
      
      if (aSaved && !bSaved) return -1;
      if (!aSaved && bSaved) return 1;
      
      return a.price - b.price;
    });

    console.log('Hotels after filtering:', results.length);

    // Filter by rating
    if (selectedRating) {
      results = results.filter((hotel) => hotel.rating >= selectedRating);
    }

    // Filter by amenities
    if (selectedAmenities.length > 0) {
      results = results.filter((hotel) => {
        const hotelAmenities = (hotel.amenities || []).map(a => 
          typeof a === 'string' ? a.toLowerCase() : ''
        );
        return selectedAmenities.every((amenityId) => {
          const filter = amenityFilters.find(f => f.id === amenityId);
          if (!filter) return true;
          return filter.keywords.some(keyword => 
            hotelAmenities.some(a => a.includes(keyword))
          );
        });
      });
    }

    // Filter by guest capacity
    if (guests > 1) {
      results = results.filter((hotel) => (hotel.guests || 2) >= guests);
    }

    // Filter out low performers (Revenue Optimization)
    results = results.filter(h => !shouldHideHotel(h.liteApiId || h.id));

    // Sort
    switch (sortBy) {
      case 'price-low':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'recommended':
      default:
        // Sort by Revenue (EPC * Volume)
        results = sortHotelsByRevenue(results);
        break;
    }

    return results;
  }, [liteApiHotels, searchQuery, priceRange, selectedRating, selectedAmenities, sortBy, guests, source, shouldHideHotel, sortHotelsByRevenue]);

  const cityAverage = useMemo(() => {
    if (!filteredHotels.length) return null;
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

  const toggleAmenity = (amenityId) => {
    setSelectedAmenities(prev => 
      prev.includes(amenityId) 
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setPriceRange([0, 3000]);
    setSelectedRating(null);
    setSelectedAmenities([]);
    setDestination('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-20">
        <div className="container-luxury">
          {/* Page Header */}
          <div className="mb-8">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Hotels</span>
            </nav>
            <h1 className="heading-display text-3xl md:text-4xl mb-2">
              Find Your Perfect Stay
            </h1>
            <p className="text-muted-foreground">
              {liteApiLoading ? 'Searching...' : `${filteredHotels.length} hotels available`}
              {source && !source.includes('static') && (
                <span className="text-xs ml-2 text-accent">(Live rates)</span>
              )}
            </p>
          </div>

          {/* Search & Booking Params Bar */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Input */}
              <div className="relative md:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Destination or hotel..."
                  className="w-full pl-10 pr-8 py-2.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Check In - reads/writes to global store */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                />
              </div>

              {/* Check Out - reads/writes to global store */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
                />
              </div>

              {/* Rooms & Guests Configuration */}
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <button
                  onClick={() => setIsRoomConfigOpen(!isRoomConfigOpen)}
                  className="w-full pl-10 pr-3 py-2.5 bg-background border border-border rounded-md text-sm text-left focus:outline-none focus:ring-2 focus:ring-accent/20 flex items-center justify-between"
                >
                  <span>
                    {rooms} Room{rooms > 1 ? 's' : ''}, {guests} Guest{guests > 1 ? 's' : ''}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isRoomConfigOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Room Config Popover */}
                {isRoomConfigOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-card border border-border rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-sm">Configuring Rooms</h3>
                      <button 
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
                            onClick={() => setRooms(Math.max(1, rooms - 1))}
                            disabled={rooms <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-medium">{rooms}</span>
                          <button
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
                            onClick={() => setGuests(Math.max(1, guests - 1))}
                            disabled={guests <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-medium">{guests}</span>
                          <button
                            onClick={() => setGuests(Math.min(20, guests + 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-secondary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Backdrop to close when clicking outside */}
                {isRoomConfigOpen && (
                  <div 
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsRoomConfigOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sort & Filter Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex gap-3 flex-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-colors ${
                  showFilters
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-accent/50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>

          {/* Filters Panel - UI-only local state */}
          {showFilters && (
            <div className="bg-card border border-border rounded-lg p-6 mb-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Price Range (per night)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) =>
                        setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])
                      }
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], parseInt(e.target.value) || 3000])
                      }
                      placeholder="Max"
                      className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Minimum Rating
                  </label>
                  <div className="flex gap-2">
                    {[4.5, 4.7, 4.9].map((rating) => (
                      <button
                        key={rating}
                        onClick={() =>
                          setSelectedRating(selectedRating === rating ? null : rating)
                        }
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedRating === rating
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        {rating}+
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-3">
                    Amenities
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {amenityFilters.map((amenity) => {
                      const Icon = amenity.icon;
                      const isSelected = selectedAmenities.includes(amenity.id);
                      return (
                        <button
                          key={amenity.id}
                          onClick={() => toggleAmenity(amenity.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {amenity.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Destinations */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Popular Destinations
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {destinations.slice(0, 4).map((dest) => (
                      <button
                        key={dest.id}
                        onClick={() => setSearchQuery(dest.name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        {dest.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {liteApiLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <span className="ml-3 text-muted-foreground">Searching hotels...</span>
            </div>
          ) : filteredHotels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHotels.map((hotel, index) => (
                <div
                  key={hotel.id || hotel.liteApiId || index}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <HotelCard hotel={hotel} cityAverage={cityAverage} budgetThreshold={budgetThreshold} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">No hotels found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filters
              </p>
              <button
                onClick={handleClearFilters}
                className="btn-outline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SearchResults;