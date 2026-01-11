import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import useBookingStore from '@/stores/useBookingStore';
import { allHotels } from '@/data/hotels';
import { useLiteApiHotelDetail } from '@/hooks/useLiteApiHotels';
import { buildAffiliateUrl } from '@/utils/affiliateLinks';
import { Check, CreditCard, Lock, ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Helper to format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'Not selected';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Read all booking-critical data from global store
  const { 
    selectedHotel, 
    checkIn,
    checkOut,
    guests, 
    rooms,
    getNights,
    getPriceBreakdown,
    clearBooking,
    setSelectedHotel,
    setSearchParams: setStoreParams,
  } = useBookingStore();

  // UI-only local state for form inputs
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Get URL params
  const urlHotelId = searchParams.get('hotelId');
  const urlCheckIn = searchParams.get('checkIn');
  const urlCheckOut = searchParams.get('checkOut');
  const urlGuests = parseInt(searchParams.get('guests')) || 2;
  const urlRooms = parseInt(searchParams.get('rooms')) || 1;

  // Check if it's a static hotel
  const staticHotel = urlHotelId ? allHotels.find((h) => h.id === parseInt(urlHotelId)) : null;
  const isLiteApiHotel = urlHotelId && !staticHotel && !selectedHotel;

  // Fetch LiteAPI hotel if needed
  const { hotel: liteApiHotel, loading: liteApiLoading } = useLiteApiHotelDetail({
    hotelId: urlHotelId,
    checkIn: urlCheckIn || checkIn,
    checkOut: urlCheckOut || checkOut,
    guests: urlGuests || guests,
    enabled: isLiteApiHotel,
  });

  // Restore booking data from URL params on refresh (if store is empty)
  useEffect(() => {
    // If no hotel in store but URL has hotelId, restore from URL
    if (!selectedHotel && urlHotelId) {
      // Try static hotel first
      if (staticHotel) {
        setSelectedHotel(staticHotel);
      } else if (liteApiHotel) {
        setSelectedHotel(liteApiHotel);
      }
      
      // Update dates/guests from URL
      setStoreParams({
        checkIn: urlCheckIn || checkIn,
        checkOut: urlCheckOut || checkOut,
        guests: urlGuests || guests,
      });
    }
  }, [staticHotel, liteApiHotel]);

  // Get computed values from store
  const nights = getNights();
  const priceBreakdown = getPriceBreakdown();

  // Build affiliate URL for the booking redirect
  const affiliateUrl = selectedHotel 
    ? buildAffiliateUrl({
        hotel: selectedHotel,
        checkIn,
        checkOut,
        guests,
        rooms,
      })
    : null;

  // Show loading for LiteAPI hotels
  if (isLiteApiHotel && liteApiLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-20 text-center container-luxury">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!selectedHotel) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-20 text-center container-luxury">
          <h1 className="text-2xl font-medium mb-4">No hotel selected</h1>
          <p className="text-muted-foreground mb-6">
            Please select a hotel to proceed with booking.
          </p>
          <Link to="/search" className="btn-primary">
            Browse Hotels
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleBookNow = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);

    // Simulate brief processing before redirect
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Show toast and redirect to affiliate partner
    toast.success('Redirecting to our booking partner...');
    
    // Open affiliate URL (external redirect)
    window.open(affiliateUrl, '_blank');
    
    // Optional: clear booking after redirect
    // clearBooking();
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-20">
        <div className="container-luxury">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <span>/</span>
            <span className="text-foreground">Checkout</span>
          </nav>

          <h1 className="heading-display text-3xl md:text-4xl mb-8">
            Complete Your Booking
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleBookNow} className="space-y-8">
                {/* Guest Details */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="font-display text-xl font-medium mb-6">
                    Guest Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Booking Partner Info */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl font-medium">
                      Complete Your Booking
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      Secure Redirect
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    You'll be redirected to our trusted booking partner to complete your reservation securely. 
                    Payment will be processed on their platform.
                  </p>
                  <div className="bg-secondary/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="w-4 h-4 text-accent" />
                      <span className="font-medium">Booking Partner</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your booking details will be securely transferred
                    </p>
                  </div>
                </div>

                {/* Special Requests */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="font-display text-xl font-medium mb-6">
                    Special Requests
                  </h2>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                    placeholder="Any special requests or preferences?"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Special requests are subject to availability and cannot be guaranteed.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full btn-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-5 h-5" />
                      Book Now - ${priceBreakdown?.total || 0}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 bg-card border border-border rounded-xl p-6">
                <h2 className="font-display text-xl font-medium mb-6">
                  Booking Summary
                </h2>

                {/* Hotel Preview */}
                <div className="flex gap-4 mb-6 pb-6 border-b border-border">
                  <img
                    src={selectedHotel.image}
                    alt={selectedHotel.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div>
                    <h3 className="font-medium text-sm mb-1">{selectedHotel.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {selectedHotel.location}
                    </p>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-accent">★</span>
                      <span>{selectedHotel.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Details from global store */}
                <div className="space-y-3 mb-6 pb-6 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-in</span>
                    <span>{formatDate(checkIn)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-out</span>
                    <span>{formatDate(checkOut)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Guests</span>
                    <span>{guests} Guest{guests > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Pricing from global store */}
                <div className="space-y-3 mb-6 pb-6 border-b border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ${priceBreakdown?.pricePerNight || 0} x {nights} night{nights > 1 ? 's' : ''}
                    </span>
                    <span>${priceBreakdown?.subtotal || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service fee</span>
                    <span>${priceBreakdown?.serviceFee || 0}</span>
                  </div>
                </div>

                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="text-xl">${priceBreakdown?.total || 0}</span>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    <span>Your payment information is encrypted and secure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
