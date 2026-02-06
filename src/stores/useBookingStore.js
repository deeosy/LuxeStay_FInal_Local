import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Utility to calculate nights between two dates
const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

// Utility to calculate price breakdown
const calculatePriceBreakdown = (hotel, nights, bookingSummary = null) => {
  // Prefer real locked price from booking summary / prebook
  if (bookingSummary?.pricing?.total) {
    const total = bookingSummary.pricing.total;
    const subtotal = total; // or break it down if LiteAPI gives components
    const serviceFee = Math.round(subtotal * 0.1);
    return {
      pricePerNight: total / nights,
      nights,
      subtotal,
      serviceFee,
      total: subtotal + serviceFee,
    };
  }

  // Fallback to hotel preview price
  if (!hotel) return null;
  const subtotal = hotel.price * nights;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;
  return {
    pricePerNight: hotel.price,
    nights,
    subtotal,
    serviceFee,
    total,
  };
};

const useBookingStore = create(
  persist(
    (set, get) => ({
      // ===== SEARCH PARAMETERS =====
      destination: '',
      checkIn: '',
      checkOut: '',
      guests: 2,
      rooms: 1,

      // ===== SELECTED HOTEL & ROOM =====
      selectedHotel: null,
      selectedRoom: null,
      selectedOffer: null, // Shape: { offerId, hotelId, roomName, price, ... }

      // EXPECTED ROOM PRICE FR0M AUTO-SELECTION
      expectedCheapestPrice: null,

      setExpectedCheapestPrice: (price) =>
        set({ expectedCheapestPrice: price }),

      // Optional: clear it when needed
      clearExpectedCheapestPrice: () =>
        set({ expectedCheapestPrice: null }),

      // ===== DERIVED: PRICE BREAKDOWN =====
      getPriceBreakdown: () => {
        const state = get();
        const nights = calculateNights(state.checkIn, state.checkOut);
        
        // Prefer selectedOffer price if available
        if (state.selectedOffer?.price?.amount) {
          const total = state.selectedOffer.price.amount;
          // If the offer price is total for the stay, use it directly.
          return {
            pricePerNight: total / nights,
            nights,
            subtotal: total,
            serviceFee: 0, 
            total: total,
          };
        }

        return calculatePriceBreakdown(
          state.selectedHotel, 
          nights, 
          state.bookingSummary
        );
      },

      // Computed nights
      getNights: () => {
        const state = get();
        return calculateNights(state.checkIn, state.checkOut);
      },

      // ===== SEARCH ACTIONS =====
      setDestination: (destination) => set({ destination }),
      
      setCheckIn: (checkIn) => set({ checkIn }),
      
      setCheckOut: (checkOut) => set({ checkOut }),
      
      setGuests: (guests) => set({ guests }),
      
      setRooms: (rooms) => set({ rooms }),

      // Set multiple search params at once
      setSearchParams: (params) => set((state) => ({
        ...state,
        ...params,
      })),

      // Reset search parameters only
      resetSearch: () => set({
        destination: '',
        checkIn: '',
        checkOut: '',
        guests: 2,
        rooms: 1,
      }),

      // ===== HOTEL SELECTION ACTIONS =====
      setSelectedHotel: (hotel) => set({ selectedHotel: hotel }),
      
      clearSelectedHotel: () => set({ selectedHotel: null, selectedRoom: null }),

      // ===== ROOM SELECTION ACTIONS =====
      setSelectedRoom: (room) => set({ selectedRoom: room }),
      setSelectedOffer: (offer) => set({ selectedOffer: offer }),
      
      clearSelectedRoom: () => set({ selectedRoom: null }),
      clearSelectedOffer: () => set({ selectedOffer: null }),

      // ===== BOOKING ACTIONS =====
      // Prepare booking with all necessary data
      prepareBooking: (hotel) => {
        const state = get();
        set({ 
          selectedHotel: hotel,
          // Preserve current search dates/guests
        });
      },

      // Clear entire booking state
      clearBooking: () => set({
        selectedHotel: null,
        selectedRoom: null,
        selectedOffer: null,
        prebookId: null,
        transactionId: null,
        secretKey: null,
        bookingSummary: null,
      }),

      // Reset everything
      resetAll: () => set({
        destination: '',
        checkIn: '',
        checkOut: '',
        guests: 2,
        rooms: 1,
        selectedHotel: null,
        selectedRoom: null,
        selectedOffer: null,
        prebookId: null,
        transactionId: null,
        secretKey: null,
        bookingSummary: null,
      }),

      // ===== LITEAPI FLOW STATE =====
      prebookId: null,
      transactionId: null,
      secretKey: null,
      bookingSummary: null,

      setPrebookResult: ({ prebookId, transactionId, secretKey }) =>
        set({ prebookId, transactionId, secretKey }),

      setBookingSummary: (summary) => set({ bookingSummary: summary }),

      resetPrebook: () => set({
        prebookId: null,
        transactionId: null,
        secretKey: null,
        bookingSummary: null,
      }),
    }),
    {
      name: 'booking-store',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for booking flow
      partialize: (state) => ({
        // Persist only critical booking data
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        guests: state.guests,
        rooms: state.rooms,
        selectedHotel: state.selectedHotel,
        selectedOffer: state.selectedOffer,
        prebookId: state.prebookId,
        transactionId: state.transactionId,
        secretKey: state.secretKey,
      }),
    }
  )
);

export default useBookingStore;
