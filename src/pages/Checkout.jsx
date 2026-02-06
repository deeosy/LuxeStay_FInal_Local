import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import useBookingStore from '@/stores/useBookingStore';
import { allHotels } from '@/data/hotels';
import { useLiteApiHotelDetail } from '@/hooks/useLiteApiHotels';
import { buildAffiliateUrl } from '@/utils/affiliateLinks';
import { Check, CreditCard, Lock, ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trackAffiliateRedirect, trackBookingClick, trackHotelView } from '@/utils/analytics';
import { trackAffiliateEvent } from '@/utils/affiliateEvents';

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
  const { hotelId: routeHotelId } = useParams();
  const isDebug = searchParams.get('debug') === 'true';
  const seoCity = searchParams.get('city');
  
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
    selectedOffer,
    setSelectedOffer,
    setPrebookResult,
    prebookId,
    transactionId,
    secretKey,
    setBookingSummary,
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
  const affiliateUrl = null; // TODO: generate real affiliate URL later
  const urlHotelId = searchParams.get('hotelId') || routeHotelId || null;
  const urlCheckIn = searchParams.get('checkIn');
  const urlCheckOut = searchParams.get('checkOut');
  const urlGuests = parseInt(searchParams.get('guests')) || 2;
  const urlRooms = parseInt(searchParams.get('rooms')) || 1;
  const urlOfferId = searchParams.get('offerId');

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
        rooms: urlRooms || rooms,
      });
      if (urlOfferId && (!selectedOffer || selectedOffer.offerId !== urlOfferId)) {
        // Hydrate minimal offer data from URL if full object is missing
        setSelectedOffer({
          offerId: urlOfferId,
          // Add minimal fallback if needed, but ideally fetch full offer
          price: { amount: liteApiHotel?.price || staticHotel?.price || 0, currency: 'USD' },
          roomName: 'Selected Room',  // Placeholder; better to refetch if critical
        });
      }
    }
  }, [staticHotel, liteApiHotel, urlHotelId, urlCheckIn, urlCheckOut, urlGuests, urlOfferId]);

  // Get computed values from store
  const nights = getNights();
  const priceBreakdown = getPriceBreakdown();

  // LiteAPI official booking flow state
  const [prebookLoading, setPrebookLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Initialize Payment SDK when step is active
  useEffect(() => {
    if (paymentStep && prebookId && secretKey) {
      const scriptId = 'liteapi-payment-sdk';

      // Load script only once
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js';
        script.async = true;
        script.onload = () => {
          console.log('✅ Payment SDK script loaded');
          initPaymentSdk();
        };
        script.onerror = () => {
          console.error('❌ Failed to load Payment SDK script');
          toast.error('Failed to load payment system. Please refresh the page.');
        };
        document.body.appendChild(script);
      } else {
        // Script already loaded, just initialize SDK
        initPaymentSdk();
      }
    }
  }, [paymentStep, prebookId, secretKey]);

  const initPaymentSdk = () => {
    console.log('Attempting to initialize LiteAPI Payment SDK');
    console.log('  → publicKey used:', "sandbox");
    console.log('  → secretKey present:', !!secretKey);
    console.log('  → transactionId:', transactionId);
    console.log('  → prebookId:', prebookId);
    console.log('  → returnUrl:', returnUrl);

    if (!window.LiteAPIPayment) {
      console.error('LiteAPIPayment global not found - script did not load correctly');
      return;
    }

    if (window.LiteAPIPayment) {
      const returnUrl = `${window.location.origin}/booking/confirmation?prebookId=${prebookId}&transactionId=${transactionId}`;
      
      try {
        new window.LiteAPIPayment({
          publicKey: "sandbox", // As per instructions
          secretKey: secretKey,
          returnUrl: returnUrl,
          targetElement: "#payment",
        });
        console.log('LiteAPIPayment initialized successfully');
      } catch (err) {
        console.error("Payment SDK Init Error:", err);
        toast.error("Failed to load payment form");
      }
    } else {
      setTimeout(initPaymentSdk, 500); // Retry if script not ready after 500ms
    }
  };

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

  // Check if we already have a valid prebook for this offer
  // If prebook exists and payment step is not active, user might be returning
  useEffect(() => {
    if (prebookId && transactionId && secretKey && !paymentStep && selectedOffer) {
      // If we have valid prebook data, advance to payment step automatically
      // But only if we are on the checkout page (which we are)
      setPaymentStep(true);
    }
  }, [prebookId, transactionId, secretKey, paymentStep, selectedOffer]);

 const handlePrebook = async (e) => {
  e.preventDefault();
  
  console.log('🎯 PREBOOK: Starting prebook process...');
  
  // Check if we already have a valid prebook for this offer
  if (prebookId && transactionId && secretKey) {
    console.log('✅ PREBOOK: Already have valid prebook data, advancing to payment');
    console.log('  prebookId:', prebookId);
    console.log('  transactionId:', transactionId);
    setPaymentStep(true);
    return;
  }

  if (!selectedOffer?.offerId) {
    console.error('❌ PREBOOK: No offer selected');
    console.error('  selectedOffer:', selectedOffer);
    toast.error('No room offer selected. Please choose a room on the hotel page.');
    navigate(-1);
    return;
  }
  
  console.log('📋 PREBOOK: Offer Details');
  console.log('  offerId:', selectedOffer.offerId);
  console.log('  roomName:', selectedOffer.roomName);
  console.log('  price:', selectedOffer.price);
  console.log('  boardName:', selectedOffer.boardName);
  console.log('  refundableTag:', selectedOffer.refundableTag);
  console.log('  hotelId:', selectedOffer.hotelId);
  console.log('  Full selectedOffer:', JSON.stringify(selectedOffer, null, 2));
  
  setPrebookLoading(true);
  
  try {
    const params = new URLSearchParams({ action: 'prebook' });
    const apiUrl = `${import.meta.env.VITE_LITEAPI_BASE}?${params.toString()}`;

    const payload = {
      offerId: selectedOffer.offerId,
      usePaymentSdk: true,
    };

    console.log('🚀 PREBOOK: Sending request');
    console.log('  API URL:', apiUrl);
    console.log('  Payload:', JSON.stringify(payload, null, 2));
    console.log('  Method: POST');

    const startTime = Date.now();
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  PREBOOK: Request took ${duration}ms`);
    console.log('📡 PREBOOK: Response status:', res.status);
    console.log('📡 PREBOOK: Response headers:', Object.fromEntries(res.headers.entries()));
    
    const data = await res.json();
    console.log('📡 PREBOOK: Response data:', JSON.stringify(data, null, 2));
    
    // Check for error in response
    if (!res.ok) {
      console.error('❌ PREBOOK: Request failed');
      console.error('  Status:', res.status);
      console.error('  Error:', data?.error);
      console.error('  Details:', data?.details);
      
      // Specific error handling
      if (res.status === 400) {
        console.error('⚠️  PREBOOK: 400 Bad Request');
        console.error('  Possible causes:');
        console.error('    1. Invalid or expired offerId');
        console.error('    2. Offer was already prebooked');
        console.error('    3. Hotel availability changed');
        console.error('    4. Missing required fields');
        console.error('  Suggestion: Try selecting the room again to get a fresh offerId');
      } else if (res.status === 401) {
        console.error('⚠️  PREBOOK: 401 Unauthorized - API key issue');
      } else if (res.status === 500) {
        console.error('⚠️  PREBOOK: 500 Server Error - LiteAPI issue');
      }
      
      throw new Error(data?.error || data?.message || `Prebook failed with status ${res.status}`);
    }
    
    // Validate response data
    console.log('🔍 PREBOOK: Validating response fields');
    console.log('  prebookId:', data.prebookId ? '✅ Present' : '❌ Missing');
    console.log('  transactionId:', data.transactionId ? '✅ Present' : '❌ Missing');
    console.log('  secretKey:', data.secretKey ? '✅ Present' : '❌ Missing');
    console.log('  pricing:', data.pricing ? '✅ Present' : 'ℹ️  Optional');
    console.log('  cancellation:', data.cancellation ? '✅ Present' : 'ℹ️  Optional');
    
    if (!data.prebookId || !data.transactionId || !data.secretKey) {
      console.error('❌ PREBOOK: Missing critical fields in response');
      console.error('  Expected: prebookId, transactionId, secretKey');
      console.error('  Received:', {
        prebookId: data.prebookId ? 'Present' : 'MISSING',
        transactionId: data.transactionId ? 'Present' : 'MISSING',
        secretKey: data.secretKey ? 'Present' : 'MISSING'
      });
      throw new Error('Incomplete prebook response from server');
    }

    console.log('✅ PREBOOK: Success! Saving prebook data...');
    
    setPrebookResult({
      prebookId: data.prebookId,
      transactionId: data.transactionId,
      secretKey: data.secretKey,
    });
    
    console.log('✅ PREBOOK: Prebook data saved to store');
    console.log('  prebookId:', data.prebookId);
    console.log('  transactionId:', data.transactionId);
    
    toast.success('Offer reserved. Proceed to payment.');
    setPaymentStep(true);
    
    console.log('✅ PREBOOK: Advanced to payment step');
    
  } catch (err) {
    console.error('❌ PREBOOK: Error in handlePrebook');
    console.error('  Error type:', err.constructor.name);
    console.error('  Error message:', err.message);
    console.error('  Error stack:', err.stack);
    console.error('  Full error:', err);
    
    // User-friendly error message
    let userMessage = 'Unable to reserve the offer.';
    
    if (err.message?.includes('400') || err.message?.includes('expired')) {
      userMessage = 'This offer has expired. Please select the room again to get updated pricing.';
      console.log('💡 PREBOOK: Suggesting user to reselect room for fresh offerId');
    } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
      userMessage = 'Network error. Please check your connection and try again.';
    }
    
    toast.error(userMessage);
  } finally {
    setPrebookLoading(false);
    console.log('🏁 PREBOOK: Process completed (loading state reset)');
  }
};

  const handleBook = async () => {
    if (!prebookId || !transactionId) {
      toast.error('Payment not initialized. Please prebook first.');
      return;
    }
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    setBookingLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'book', // Updated to 'book' per instructions
      });
      
      const payload = {
        prebookId,
        holder: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        },
        payment: {
          method: "TRANSACTION_ID",
          transactionId: transactionId
        },
        guests: [
          {
            occupancyNumber: 1,
            firstName: formData.firstName, // Assuming primary guest is holder for now
            lastName: formData.lastName,
            email: formData.email
          }
        ]
      };

      const res = await fetch(`${import.meta.env.VITE_LITEAPI_BASE}?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok || !data.bookingId) {
        throw new Error(data?.error || 'Booking failed');
      }
      setBookingSummary({
        bookingId: data.bookingId,
        confirmationCode: data.confirmationCode || data.bookingId,
        hotel: selectedHotel,
        checkIn,
        checkOut,
        price: { total: getPriceBreakdown()?.total || 0 },
      });
      // Clear prebook data after successful booking
      // resetPrebook(); // Optional: keep for confirmation page if needed
      navigate('/booking/confirmation');
    } catch (err) {
      toast.error(err.message || 'Booking failed.');
    } finally {
      setBookingLoading(false);
    }
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

          {isDebug && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900 p-4 mb-8 rounded-r shadow-sm">
              <div className="flex items-center gap-2 font-bold mb-2">
                <span className="text-xl">🐞</span>
                <span>Debug Affiliate Mode Active</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm font-mono">
                <div>
                  <span className="font-semibold text-yellow-800">Hotel ID:</span> {selectedHotel?.id || selectedHotel?.liteApiId}
                </div>
                <div>
                  <span className="font-semibold text-yellow-800">City:</span> {seoCity || selectedHotel?.city}
                </div>
                <div>
                  <span className="font-semibold text-yellow-800">Dates:</span> {checkIn} → {checkOut}
                </div>
                <div>
                  <span className="font-semibold text-yellow-800">Guests/Rooms:</span> {guests} / {rooms}
                </div>
                <div className="col-span-full mt-2 pt-2 border-t border-yellow-200 break-all">
                  <span className="font-semibold text-yellow-800">Affiliate Link:</span>
                  <div className="text-xs mt-1 bg-white/50 p-2 rounded">{affiliateUrl || 'Not generated'}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
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
                      Payment
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      Secure Sandbox
                    </div>
                  </div>
{!paymentStep ? (
  <>
    <p className="text-sm text-muted-foreground mb-4">
      Reserve your selected offer and proceed to payment.
    </p>
    {/* Show selected offer details */}
    {selectedOffer && (
      <div className="mb-4 p-3 bg-secondary/30 rounded-lg">
        <p className="text-xs font-medium mb-1">Selected Room:</p>
        <p className="text-sm">{selectedOffer.roomName}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedOffer.boardName} • {selectedOffer.refundableTag === 'RFN' ? 'Free Cancellation' : 'Non-refundable'}
        </p>
        <p className="text-sm font-semibold mt-2">
          ${Math.ceil(selectedOffer.price.amount).toLocaleString()} total
        </p>
      </div>
    )}
    <button
      type="button"
      onClick={handlePrebook}
      disabled={prebookLoading || !selectedOffer?.offerId}
      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {prebookLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Reserving...
        </>
      ) : (
        'Reserve & Continue'
      )}
    </button>
    {!selectedOffer?.offerId && (
      <p className="text-xs text-red-600 mt-2">
        ⚠️ No room selected. Please go back and select a room first.
      </p>
    )}
  </>
) : (
  <>
    <div className="bg-secondary/50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-sm mb-4">
        <CreditCard className="w-4 h-4 text-accent" />
        <span className="font-medium">Secure Payment</span>
      </div>
      
      {/* ✅ NEW: Loading state while SDK initializes */}
      {!window.LiteAPIPayment && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent mb-3" />
          <p className="text-sm text-muted-foreground">Loading secure payment form...</p>
          <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
        </div>
      )}
      
      {/* LiteAPI Payment Container - always rendered for SDK to find it */}
      <div 
        id="payment" 
        className={`min-h-[300px] bg-white rounded-md p-4 border border-border ${!window.LiteAPIPayment ? 'hidden' : ''}`}
      ></div>
      
      {/* ✅ IMPROVED: Only show button after SDK loads */}
      {window.LiteAPIPayment && (
        <button
          type="button"
          onClick={handleBook}
          disabled={bookingLoading}
          className="mt-6 w-full btn-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {bookingLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5" />
              Confirm & Pay
            </>
          )}
        </button>
      )}
      
      {/* ✅ NEW: Helpful note about test cards */}
      {window.LiteAPIPayment && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-900 mb-1">💳 Test Card Information</p>
          <p className="text-xs text-blue-800">
            Card: <code className="bg-blue-100 px-1 rounded">4242 4242 4242 4242</code><br/>
            Expiry: Any future date • CVC: Any 3 digits
          </p>
        </div>
      )}
    </div>
  </>
)}
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
                  {/* selected room */}
                    {selectedOffer && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Room</span>
                        <span className="text-right text-xs">{selectedOffer.roomName}</span>
                      </div>
                    )}
                    {selectedOffer && selectedOffer.boardName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Meal Plan</span>
                        <span className="text-right text-xs">{selectedOffer.boardName}</span>
                      </div>
                    )}
                </div>
                

{/* Pricing from global store */}
{!priceBreakdown ? (
  <div className="space-y-3 mb-6 pb-6 border-b border-border">
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p className="text-sm text-yellow-800 mb-2">
        ⚠️ Price information unavailable
      </p>
      <p className="text-xs text-yellow-700">
        Please go back and select your dates and room to see pricing.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="mt-3 text-xs text-yellow-900 underline hover:no-underline"
      >
        ← Return to hotel page
      </button>
    </div>
  </div>
) : (
  <>
    <div className="space-y-3 mb-6 pb-6 border-b border-border">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          ${Math.ceil(priceBreakdown.pricePerNight || 0).toLocaleString()} x {nights} night{nights > 1 ? 's' : ''}
        </span>
        <span>${Math.ceil(priceBreakdown.subtotal || 0).toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Service fee</span>
        <span>${Math.ceil(priceBreakdown.serviceFee || 0).toLocaleString()}</span>
      </div>
    </div>

    <div className="flex justify-between font-medium">
      <span>Total</span>
      <span className="text-xl">${Math.ceil(priceBreakdown.total || 0).toLocaleString()}</span>
    </div>
  </>
)}

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
