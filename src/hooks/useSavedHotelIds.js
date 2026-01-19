import { supabase } from '@/integrations/supabase/client';
import useAuthStore from '@/stores/useAuthStore';

export function useSavedHotelIds() {
  const user = useAuthStore((state) => state.user);
  const savedHotelIds = useAuthStore((state) => state.savedHotelIds);
  const savedHotelIdsLoaded = useAuthStore((state) => state.savedHotelIdsLoaded);
  const savedHotelIdsLoading = useAuthStore((state) => state.savedHotelIdsLoading);
  const addSavedHotelId = useAuthStore((state) => state.addSavedHotelId);
  const removeSavedHotelId = useAuthStore((state) => state.removeSavedHotelId);
  const clearSavedHotelIds = useAuthStore((state) => state.clearSavedHotelIds);

  const isHotelSaved = (hotelId) => {
    if (!hotelId) {
      return false;
    }
    return savedHotelIds.includes(String(hotelId));
  };

  const toggleHotelSaved = async (hotelId) => {
    if (!user || !hotelId) {
      return { error: 'not_authenticated' };
    }

    const value = String(hotelId);
    const alreadySaved = savedHotelIds.includes(value);

    // Optimistic Update
    if (alreadySaved) {
      removeSavedHotelId(value);
    } else {
      addSavedHotelId(value);
    }

    let error = null;

    if (alreadySaved) {
      const { error: dbError } = await supabase
        .from('user_saved_hotels')
        .delete()
        .eq('user_id', user.id)
        .eq('hotel_id', value);
      error = dbError;
    } else {
      const { error: dbError } = await supabase
        .from('user_saved_hotels')
        .upsert(
          {
            user_id: user.id,
            hotel_id: value,
          },
          {
            onConflict: 'user_id,hotel_id',
          }
        );
      error = dbError;
    }

    // Rollback on failure
    if (error) {
      if (alreadySaved) {
        addSavedHotelId(value);
      } else {
        removeSavedHotelId(value);
      }
    }

    return { error };
  };

  return {
    savedHotelIds,
    loading: savedHotelIdsLoading || (Boolean(user) && !savedHotelIdsLoaded),
    isHotelSaved,
    toggleHotelSaved,
  };
}
