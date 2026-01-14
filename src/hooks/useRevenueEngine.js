import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Simple in-memory cache to prevent redundant fetches
let cachedData = null;
let fetchPromise = null;

export const useRevenueEngine = () => {
  const [performanceMap, setPerformanceMap] = useState(cachedData?.map || {});
  const [globalStats, setGlobalStats] = useState(cachedData?.global || { epc: 0 });
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) {
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchPerformanceData();
    }

    fetchPromise.then((data) => {
      if (data) {
        cachedData = data;
        setPerformanceMap(data.map);
        setGlobalStats(data.global);
      }
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('hotel_performance')
        .select('*');

      if (error) {
        console.warn('Failed to load revenue engine data:', error);
        return null;
      }

      if (data) {
        const map = {};
        let global = { epc: 0 };

        data.forEach(row => {
          if (row.hotel_id === 'GLOBAL_SETTINGS') {
            global = row;
          } else {
            map[row.hotel_id] = row;
          }
        });

        return { map, global };
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const getHotelStats = (hotelId) => {
    return performanceMap[hotelId] || { clicks: 0, revenue: 0, epc: 0, is_hidden: false };
  };

  const shouldHideHotel = (hotelId) => {
    const stats = getHotelStats(hotelId);
    if (stats.is_hidden) return true;

    // Algorithmic Kill-Switch:
    // If > 100 clicks AND EPC < Threshold % of site average
    const threshold = globalStats.epc_threshold ?? 0.5;
    
    if (stats.clicks > 100 && stats.epc < (globalStats.epc * threshold)) {
      return true;
    }

    return false;
  };

  const getBadges = (hotelId) => {
    const stats = getHotelStats(hotelId);
    const badges = [];

    // Dynamic CTA Optimization
    if (stats.epc > globalStats.epc && globalStats.epc > 0) {
      badges.push({
        type: 'top_converting',
        label: '🔥 Top Converting',
        tooltip: 'Travelers book this hotel more often than others.'
      });
    } else if (stats.epc < globalStats.epc && stats.clicks > 50 && globalStats.epc > 0) {
       // Only show "Try Instead" if we have some data confidence (> 50 clicks)
       // and it's underperforming
       badges.push({
         type: 'try_instead',
         label: '💰 Try This Instead',
         tooltip: 'Better value options available nearby.'
       });
    }

    return badges;
  };

  const getBetterAlternative = (currentHotelId, similarHotels) => {
    const currentStats = getHotelStats(currentHotelId);
    
    // If current hotel is performing well (above avg), no need to divert
    if (currentStats.epc >= globalStats.epc) return null;

    // Find a similar hotel with significantly better EPC
    if (!similarHotels || similarHotels.length === 0) return null;

    const betterHotel = similarHotels.find(h => {
      const stats = getHotelStats(h.liteApiId || h.id);
      return stats.epc > globalStats.epc;
    });

    return betterHotel || null;
  };

  const sortHotelsByRevenue = (hotels) => {
    if (!hotels) return [];
    return [...hotels].sort((a, b) => {
      const statsA = getHotelStats(a.liteApiId || a.id);
      const statsB = getHotelStats(b.liteApiId || b.id);
      
      // Revenue Weight = EPC * Click Volume (which is Total Revenue, but we use the formula for clarity)
      // Actually we have 'revenue' column, so we can just use that.
      // But let's follow the instruction: EPC * Click volume.
      // (Which matches revenue).
      
      // We also need to handle new hotels (0 clicks).
      // Maybe give them a boost or treat as neutral?
      // Instruction says "Sort by EPC x Click volume".
      
      const scoreA = statsA.revenue || 0;
      const scoreB = statsB.revenue || 0;

      return scoreB - scoreA;
    });
  };

  return {
    loading,
    globalStats,
    getHotelStats,
    shouldHideHotel,
    getBadges,
    getBetterAlternative,
    sortHotelsByRevenue,
    refresh: fetchPerformanceData
  };
};
