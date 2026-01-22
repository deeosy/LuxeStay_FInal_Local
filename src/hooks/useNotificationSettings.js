import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useAuthStore from '@/stores/useAuthStore';

export function useNotificationSettings() {
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // No row found, insert default
          const defaultSettings = {
            user_id: user.id,
            price_drop_alerts: false,
            availability_alerts: false,
            deal_alerts: false,
            marketing_emails: false,
            price_alert_frequency: 'weekly',
          };

          const { data: newData, error: insertError } = await supabase
            .from('user_notification_settings')
            .insert([defaultSettings])
            .select()
            .single();

          if (insertError) {
            console.error('Error creating default notification settings:', insertError);
            // Don't throw, just let it fail silently or retry next time
          } else {
            if (mounted) setSettings(newData);
          }
        } else if (error) {
          console.error('Error fetching notification settings:', error);
        } else {
          if (mounted) setSettings(data);
        }
      } catch (err) {
        console.error('Unexpected error in useNotificationSettings:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSettings();

    return () => {
      mounted = false;
    };
  }, [user]);

  const updateSetting = async (key, value) => {
    if (!settings) return;

    // Optimistic update
    const oldSettings = { ...settings };
    setSettings((prev) => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error(`Error updating notification setting ${key}:`, err);
      // Revert on error
      setSettings(oldSettings);
    }
  };

  return { settings, loading, updateSetting };
}
