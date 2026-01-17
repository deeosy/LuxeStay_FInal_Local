import { Link } from 'react-router-dom';
import HotelCard from './HotelCard';
import { featuredHotels } from '@/data/hotels';
import { ArrowRight } from 'lucide-react';
import { useRevenueEngine } from '@/hooks/useRevenueEngine';

const FeaturedHotels = () => {
  const { shouldHideHotel, sortHotelsByRevenue } = useRevenueEngine();
  const visibleHotels = sortHotelsByRevenue(featuredHotels.filter(h => !shouldHideHotel(h.id)));
  const averagePrice =
    visibleHotels.reduce((acc, curr) => acc + (curr.price || 0), 0) /
    (visibleHotels.length || 1);

  const budgetThreshold = (() => {
    const prices = visibleHotels
      .map(h => h.price || 0)
      .filter(price => price > 0);
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const index = Math.floor((sorted.length - 1) * 0.3);
    return sorted[index];
  })();

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container-luxury">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <p className="section-title">Featured Hotels</p>
            <h2 className="heading-display text-3xl md:text-4xl">
              Our Exquisite Collection
            </h2>
          </div>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-accent transition-colors group"
          >
            View All Hotels
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleHotels.map((hotel, index) => (
            <div
              key={hotel.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <HotelCard
                hotel={hotel}
                cityAverage={averagePrice}
                budgetThreshold={budgetThreshold}
                variant="featured"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedHotels;
