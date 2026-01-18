const DEFAULT_CONFIG = {
  seoEnabled: false
};

export async function getSeoSystemConfig(supabase) {
  if (!supabase) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const { data, error } = await supabase
      .from('seo_system_config')
      .select('key, value')
      .eq('key', 'seo_enabled')
      .maybeSingle();

    if (error) {
      console.error('getSeoSystemConfig query error', error);
      return { ...DEFAULT_CONFIG };
    }

    if (!data || !data.value || typeof data.value !== 'object') {
      return { ...DEFAULT_CONFIG };
    }

    const enabled =
      Object.prototype.hasOwnProperty.call(data.value, 'enabled') &&
      data.value.enabled === true;

    return {
      seoEnabled: !!enabled
    };
  } catch (error) {
    console.error('getSeoSystemConfig unexpected error', error);
    return { ...DEFAULT_CONFIG };
  }
}

