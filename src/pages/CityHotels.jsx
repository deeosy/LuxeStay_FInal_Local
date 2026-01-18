import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HotelCard from '@/components/HotelCard';
import { useLiteApiSearch } from '@/hooks/useLiteApiHotels';
import { getCityBySlug } from '@/data/cities';
import SEOMetadata from '@/components/seo/SEOMetadata';
import { useIndexing } from '@/hooks/useIndexing';
import { useRevenueEngine } from '@/hooks/useRevenueEngine';
import { Loader2 } from 'lucide-react';

const CityHotels = () => {
  const { citySlug, filterSlug } = useParams();
  const city = getCityBySlug(citySlug);

  const searchParams = useMemo(() => {
    if (!city) return { enabled: false };

    if (city.liteApiLocationId) {
      return {
        locationId: city.liteApiLocationId,
        guests: 2,
        rooms: 1,
        enabled: true,
      };
    }

    return {
      destination: city.query || city.cityName,
      guests: 2,
      rooms: 1,
      enabled: true,
    };
  }, [city]);

  const { hotels, loading, error } = useLiteApiSearch(searchParams);
  const { shouldHideHotel, sortHotelsByRevenue } = useRevenueEngine();

  const baseHotels = useMemo(() => {
    if (!hotels) return [];
    return hotels.filter((h) => {
      const id = h.liteApiId || h.id;
      return !shouldHideHotel(id);
    });
  }, [hotels, shouldHideHotel]);

  const baseBudgetThreshold = useMemo(() => {
    if (!baseHotels.length) return null;
    const prices = baseHotels
      .map((h) => h.price || 0)
      .filter((price) => price > 0);
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const index = Math.floor((sorted.length - 1) * 0.3);
    return sorted[index];
  }, [baseHotels]);

  const filteredHotels = useMemo(() => {
    if (!baseHotels.length) return [];

    let result = [...baseHotels];

    switch (filterSlug) {
      case 'cheap-hotels':
        if (baseBudgetThreshold != null) {
          result = result.filter(
            (h) =>
              h.price &&
              h.price > 0 &&
              h.price <= baseBudgetThreshold
          );
        }
        break;
      case '5-star-hotels':
        result = result.filter((h) => (h.rating || 0) >= 4.5);
        break;
      case 'free-cancellation':
        result = result.filter((h) => Boolean(h.freeCancellation));
        break;
      case 'near-airport':
        result = result.filter(
          (h) =>
            Array.isArray(h.tags) &&
            h.tags.some((t) =>
              String(t).toLowerCase().includes('airport')
            )
        );
        break;
      default:
        break;
    }

    return sortHotelsByRevenue(result);
  }, [baseHotels, baseBudgetThreshold, filterSlug, sortHotelsByRevenue]);

  const cityAverage = useMemo(() => {
    if (!filteredHotels.length) return null;
    return (
      filteredHotels.reduce((acc, h) => acc + (h.price || 0), 0) /
      filteredHotels.length
    );
  }, [filteredHotels]);

  const budgetThreshold = useMemo(() => {
    if (!filteredHotels.length) return null;
    const prices = filteredHotels
      .map((h) => h.price || 0)
      .filter((price) => price > 0);
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const index = Math.floor((sorted.length - 1) * 0.3);
    return sorted[index];
  }, [filteredHotels]);

  const pagePath = filterSlug
    ? `/hotels/${citySlug}/${filterSlug}`
    : `/hotels/${citySlug}`;
  const pageUrl = `https://luxestayhaven.com${pagePath}`;
  useIndexing(pageUrl);

  const cityName =
    city?.cityName ||
    (citySlug ? citySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');

  let pageTitle;
  let pageDescription;

  if (filterSlug === 'cheap-hotels') {
    pageTitle = `Cheap Hotels in ${cityName} – Best Budget Deals`;
    pageDescription = `Find cheap hotels in ${cityName}. Compare budget-friendly stays with trusted partners and book securely.`;
  } else if (filterSlug === '5-star-hotels') {
    pageTitle = `5 Star Hotels in ${cityName} – Luxury Stays`;
    pageDescription = `Discover 5 star hotels in ${cityName}. Compare luxury stays and book securely with trusted partners.`;
  } else if (filterSlug === 'free-cancellation') {
    pageTitle = `Hotels with Free Cancellation in ${cityName}`;
    pageDescription = `Compare hotels with free cancellation in ${cityName}. Keep your plans flexible and book securely.`;
  } else if (filterSlug === 'near-airport') {
    pageTitle = `Hotels Near Airport in ${cityName}`;
    pageDescription = `Find hotels near the airport in ${cityName}. Choose convenient stays close to your departure or arrival.`;
  } else {
    pageTitle = city
      ? `Hotels in ${city.cityName} – Compare Deals & Book Securely`
      : `Hotels in ${cityName} – Compare Deals & Book Securely`;
    pageDescription = city
      ? `Compare hotels in ${city.cityName} from trusted booking partners. Find great deals, free cancellation options, and book securely.`
      : `Compare hotels in ${cityName} from trusted booking partners. Find great deals, free cancellation options, and book securely.`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOMetadata
        title={pageTitle}
        description={pageDescription}
        canonical={pageUrl}
        ogType="website"
      />
      <Header />

      <main className="flex-grow pt-24 pb-20">
        <div className="container-luxury">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-foreground">Hotels in {cityName}</span>
          </nav>

          <h1 className="heading-display text-3xl md:text-4xl mb-3">
              {filterSlug === 'cheap-hotels' ? `Cheap Hotels in ${cityName}` : `Hotels in ${cityName}` }
          </h1>
          <p className="text-muted-foreground mb-8">
            Compare hotels in {cityName}. View nightly rates, check amenities, and
            book securely with trusted booking partners.
          </p>

          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <h2 className="text-xl font-medium mb-2">Unable to load hotels</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : filteredHotels.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-xl font-medium mb-2">
                No hotels found in {cityName}
              </h2>
              <p className="text-muted-foreground">
                Try searching a different destination or adjust your filters.
              </p>
              <Link to="/search" className="btn-primary mt-4 inline-flex">
                Back to Search
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id || hotel.liteApiId}
                  hotel={hotel}
                  cityAverage={cityAverage}
                  budgetThreshold={budgetThreshold}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CityHotels;
