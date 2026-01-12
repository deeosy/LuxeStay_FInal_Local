import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';

const AdminAffiliate = () => {
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalClicks, setTotalClicks] = useState(0);
  const [stats, setStats] = useState({
    byCity: [],
    byHotel: [],
    byPage: []
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

      // Get Data for Aggregation (Last 1000 for trends)
      const { data: trendData, error: trendError } = await supabase
        .from('affiliate_clicks')
        .select('city, hotel_name, page_path')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (trendError) throw trendError;

      if (trendData) {
        const cityMap = {};
        const hotelMap = {};
        const pageMap = {};

        trendData.forEach(row => {
          const city = row.city || 'Unknown';
          const hotel = row.hotel_name || 'Unknown';
          const page = row.page_path || 'Unknown';

          cityMap[city] = (cityMap[city] || 0) + 1;
          hotelMap[hotel] = (hotelMap[hotel] || 0) + 1;
          pageMap[page] = (pageMap[page] || 0) + 1;
        });

        const toChartData = (map) => Object.entries(map)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setStats({
          byCity: toChartData(cityMap),
          byHotel: toChartData(hotelMap),
          byPage: toChartData(pageMap)
        });
      }

    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Affiliate Intelligence</h1>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
            <span className="text-sm text-gray-500">Total Clicks</span>
            <p className="text-2xl font-bold text-primary">{totalClicks}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Clicks by City */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Top Cities</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byCity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Hotels */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Top Hotels</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byHotel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={150} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold mb-4">Clicks by Page</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byPage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Clicks Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Last 50 Clicks</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-3">Time</th>
                  <th className="px-6 py-3">City</th>
                  <th className="px-6 py-3">Hotel</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clicks.map((click) => (
                  <tr key={click.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(click.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">{click.city || '-'}</td>
                    <td className="px-6 py-3 text-gray-600">{click.hotel_name || '-'}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {click.price ? `$${click.price}` : '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-500 truncate max-w-xs" title={click.page_path}>
                      {click.page_path || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAffiliate;
