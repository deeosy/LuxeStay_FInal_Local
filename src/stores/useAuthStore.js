import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  initialized: false,
  savedHotelIds: [],
  savedHotelIdsLoaded: false,
  savedHotelIdsLoading: false,
  setAuthState: (payload) =>
    set({
      user: payload?.user || null,
      session: payload?.session || null,
      initialized: true,
    }),
  clearAuthState: () =>
    set({
      user: null,
      session: null,
      initialized: true,
      savedHotelIds: [],
      savedHotelIdsLoaded: false,
      savedHotelIdsLoading: false,
    }),
  setSavedHotelIds: (ids) =>
    set({
      savedHotelIds: Array.isArray(ids) ? ids : [],
      savedHotelIdsLoaded: true,
      savedHotelIdsLoading: false,
    }),
  addSavedHotelId: (id) =>
    set((state) => {
      const value = String(id);
      if (state.savedHotelIds.includes(value)) {
        return state;
      }
      return {
        savedHotelIds: [...state.savedHotelIds, value],
        savedHotelIdsLoaded: true,
        savedHotelIdsLoading: false,
      };
    }),
  removeSavedHotelId: (id) =>
    set((state) => {
      const value = String(id);
      return {
        savedHotelIds: state.savedHotelIds.filter((item) => item !== value),
        savedHotelIdsLoaded: true,
        savedHotelIdsLoading: false,
      };
    }),
  clearSavedHotelIds: () =>
    set({
      savedHotelIds: [],
      savedHotelIdsLoaded: false,
      savedHotelIdsLoading: false,
    }),
  loadSavedHotelIds: async (userId) => {
    if (!userId) {
      set({
        savedHotelIds: [],
        savedHotelIdsLoaded: false,
        savedHotelIdsLoading: false,
      });
      return;
    }

    const state = get();

    if (state.savedHotelIdsLoaded || state.savedHotelIdsLoading) {
      return;
    }

    set({
      savedHotelIdsLoading: true,
    });

    const { data, error } = await supabase
      .from('user_saved_hotels')
      .select('hotel_id')
      .eq('user_id', userId);

    if (error || !data) {
      set({
        savedHotelIds: [],
        savedHotelIdsLoaded: true,
        savedHotelIdsLoading: false,
      });
      return;
    }

    const ids = data.map((row) => String(row.hotel_id));

    set({
      savedHotelIds: ids,
      savedHotelIdsLoaded: true,
      savedHotelIdsLoading: false,
    });
  },
}));

export default useAuthStore;
