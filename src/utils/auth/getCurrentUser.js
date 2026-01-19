import { createClient } from '@supabase/supabase-js';

export const getCurrentUser = async ({ supabaseClient, headers, cookies }) => {
  try {
    let supabase = supabaseClient;

    if (!supabase) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return null;
      }

      supabase = createClient(supabaseUrl, supabaseKey);
    }

    let accessToken = null;

    if (headers) {
      const authHeader = headers.authorization || headers.Authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.replace('Bearer ', '').trim();
      }
    }

    if (!accessToken && cookies) {
      const authCookie = cookies['sb-access-token'] || cookies['access_token'];
      if (authCookie) {
        accessToken = authCookie;
      }
    }

    if (!accessToken) {
      return null;
    }

    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email || null,
    };
  } catch {
    return null;
  }
};

