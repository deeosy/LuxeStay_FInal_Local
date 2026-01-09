import { create } from 'zustand';

// Utility to calculate nights between two dates
const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

// Utility to calculate price breakdown
const calculatePriceBreakdown = (hotel, nights) => {
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

const useBookingStore = create((set, get) => ({
  // ===== SEARCH PARAMETERS =====
  destination: '',
  checkIn: '',
  checkOut: '',
  guests: 2,
  rooms: 1,

  // ===== SELECTED HOTEL & ROOM =====
  selectedHotel: null,
  selectedRoom: null,

  // ===== DERIVED: PRICE BREAKDOWN =====
  // Computed on-the-fly based on selectedHotel and dates
  getPriceBreakdown: () => {
    const state = get();
    const nights = calculateNights(state.checkIn, state.checkOut);
    return calculatePriceBreakdown(state.selectedHotel, nights);
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
  
  clearSelectedRoom: () => set({ selectedRoom: null }),

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
  }),
}));

export default useBookingStore;
