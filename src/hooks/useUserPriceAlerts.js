import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useAuthStore from '@/stores/useAuthStore';

export function useUserPriceAlerts() {
  const user = useAuthStore((state) => state.user);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setAlerts([]);
      return;
    }

    let mounted = true;

    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('user_price_alert_queue')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
           // Silent failure
           // console.error(error);
        } else if (mounted) {
          setAlerts(data || []);
        }
      } catch (err) {
        // Silent failure
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAlerts();

    return () => {
      mounted = false;
    };
  }, [user]);

  return { alerts, loading };
}
