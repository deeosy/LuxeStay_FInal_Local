import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favorites: [],

      // Add hotel to favorites
      addFavorite: (hotel) => {
        const { favorites } = get();
        const hotelId = hotel.liteApiId || hotel.id;
        if (!favorites.some(f => (f.liteApiId || f.id) === hotelId)) {
          set({ favorites: [...favorites, hotel] });
        }
      },

      // Remove hotel from favorites
      removeFavorite: (hotelId) => {
        const { favorites } = get();
        set({
          favorites: favorites.filter(f => (f.liteApiId || f.id) !== hotelId),
        });
      },

      // Toggle favorite status
      toggleFavorite: (hotel) => {
        const { isFavorite, addFavorite, removeFavorite } = get();
        const hotelId = hotel.liteApiId || hotel.id;
        if (isFavorite(hotelId)) {
          removeFavorite(hotelId);
        } else {
          addFavorite(hotel);
        }
      },

      // Check if hotel is favorited
      isFavorite: (hotelId) => {
        const { favorites } = get();
        return favorites.some(f => (f.liteApiId || f.id) === hotelId);
      },

      // Get all favorites
      getFavorites: () => get().favorites,

      // Clear all favorites
      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: 'hotel-favorites',
    }
  )
);

export default useFavoritesStore;
