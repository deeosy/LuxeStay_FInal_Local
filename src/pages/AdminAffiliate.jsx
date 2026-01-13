import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from '@/components/layout/Header';
import { Loader2, DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';

const AdminAffiliate = () => {
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalClicks, setTotalClicks] = useState(0);
  const [revenueStats, setRevenueStats] = useState({
    total: 0,
    today: 0,
    week: 0,
    month: 0,
    epc: 0
  });
  const [stats, setStats] = useState({
    byCity: [],
    byHotel: [],
    byPage: [],
    topRevenueCities: [],
    topRevenueHotels: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get Total Count
      const { count } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true });
      
      setTotalClicks(count || 0);

      // Get Recent Clicks for Table
      const { data: recent, error: recentError } = await supabase
        .from('affiliate_clicks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentError) throw recentError;
      setClicks(recent || []);

      // Get Data for Aggregation (Last 2000 for robust trends)
      const { data: trendData, error: trendError } = await supabase
        .from('affiliate_clicks')
        .select('city, hotel_name, page_path, created_at, offer_price, offer_commission')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (trendError) throw trendError;

      if (trendData) {
        const cityMap = {};
        const hotelMap = {};
        const pageMap = {};
        
        // Revenue maps
        const cityRevenueMap = {};
        const hotelRevenueMap = {};

        let totalRev = 0;
        let todayRev = 0;
        let weekRev = 0;
        let monthRev = 0;
        
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        trendData.forEach(row => {
          const city = row.city || 'Unknown';
          const hotel = row.hotel_name || 'Unknown';
          const page = row.page_path || 'Unknown';

          // Counts
          cityMap[city] = (cityMap[city] || 0) + 1;
          hotelMap[hotel] = (hotelMap[hotel] || 0) + 1;
          pageMap[page] = (pageMap[page] || 0) + 1;

          // Revenue Calculation
          // If offer_commission is a rate (e.g. 0.08), revenue = price * rate
          // If we logged the absolute commission amount, we would just sum it.
          // Assuming requirement: Revenue estimate = SUM(offer_price * offer_commission)
          const rev = (row.offer_price || 0) * (row.offer_commission || 0);
          
          if (rev > 0) {
            cityRevenueMap[city] = (cityRevenueMap[city] || 0) + rev;
            hotelRevenueMap[hotel] = (hotelRevenueMap[hotel] || 0) + rev;
            totalRev += rev;

            const date = new Date(row.created_at);
            const diffTime = Math.abs(now - date);
            const diffDays = diffTime / oneDay;

            if (diffDays <= 1) todayRev += rev;
            if (diffDays <= 7) weekRev += rev;
            if (diffDays <= 30) monthRev += rev;
          }
        });

        const toChartData = (map) => Object.entries(map)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        
        const toRevenueData = (map) => Object.entries(map)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        setStats({
          byCity: toChartData(cityMap),
          byHotel: toChartData(hotelMap),
          byPage: toChartData(pageMap),
          topRevenueCities: toRevenueData(cityRevenueMap),
          topRevenueHotels: toRevenueData(hotelRevenueMap)
        });

        setRevenueStats({
          total: totalRev,
          today: todayRev,
          week: weekRev,
          month: monthRev,
          epc: count > 0 ? totalRev / count : 0
        });
      }

    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-32 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Revenue Intelligence</h1>
          <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
              <span className="text-xs text-gray-500 uppercase font-bold">Total Clicks</span>
              <p className="text-2xl font-bold text-gray-900">{totalClicks}</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-green-100 bg-green-50/30">
              <span className="text-xs text-green-700 uppercase font-bold">Est. Revenue</span>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(revenueStats.total)}</p>
            </div>
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-600">Revenue Today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueStats.today)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-600">This Week</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueStats.week)}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-600">This Month</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueStats.month)}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-600">EPC (Avg)</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueStats.epc)}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue by City */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Top Earning Cities</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topRevenueCities}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip formatter={(val) => formatCurrency(val)} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Hotels by Revenue */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Top Earning Hotels</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topRevenueHotels} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={150} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(val) => formatCurrency(val)} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Clicks Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Live Traffic Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">City</th>
                  <th className="px-6 py-3">Hotel</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Est. Rev</th>
                  <th className="px-6 py-3">Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clicks.map((click) => {
                   const estRev = (click.offer_price || 0) * (click.offer_commission || 0);
                   return (
                    <tr key={click.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(click.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900">{click.city || '-'}</td>
                      <td className="px-6 py-3 text-gray-600">{click.hotel_name || '-'}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {click.offer_price ? `$${click.offer_price}` : (click.price ? `$${click.price}` : '-')}
                      </td>
                      <td className="px-6 py-3 text-green-600 font-medium">
                         {estRev > 0 ? formatCurrency(estRev) : '-'}
                      </td>
                      <td className="px-6 py-3 text-gray-500 truncate max-w-xs" title={click.page_path}>
                        {click.page_path || '-'}
                      </td>
                    </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAffiliate;