import { useMemo } from 'react';
import { Link, useParams, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useLiteApiSearch } from '@/hooks/useLiteApiHotels';
import useBookingStore from '@/stores/useBookingStore';
import HotelCard from '@/components/HotelCard';

const SITE_ORIGIN = 'https://luxestayhaven.com';

const titleCaseFromSlug = (slug) => {
  return (slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const POI_MAP = {
  jfk: {
    title: 'Hotels Near JFK Airport',
    destination: 'JFK Airport, New York',
    citySlug: 'new-york',
  },
  'eiffel-tower': {
    title: 'Hotels Near Eiffel Tower',
    destination: 'Eiffel Tower, Paris',
    citySlug: 'paris',
  },
};

const PoiLandingPage = () => {
  const { poiSlug } = useParams();
  const location = useLocation();

  const { checkIn, checkOut, guests, rooms } = useBookingStore();

  const poiConfig = useMemo(() => {
    if (!poiSlug) return null;
    const mapped = POI_MAP[poiSlug];
    if (mapped) return mapped;

    const name = titleCaseFromSlug(poiSlug);
    return {
      title: `Hotels Near ${name}`,
      destination: name,
      citySlug: null,
    };
  }, [poiSlug]);

  const pageUrl = `${SITE_ORIGIN}${location.pathname}`;
  const pageTitle = poiConfig ? `${poiConfig.title} (2026) — Compare Prices` : 'Hotels Near';
  const metaDescription = poiConfig
    ? `Compare prices for ${poiConfig.title.toLowerCase()} with real-time availability. LuxeStay shows top stays and deals near your destination.`
    : 'Compare hotel prices with real-time availability.';

  const { hotels, loading, error } = useLiteApiSearch({
    destination: poiConfig?.destination,
    checkIn,
    checkOut,
    guests,
    rooms,
    enabled: !!poiConfig,
  });

  const citySlugForLinks = poiConfig?.citySlug || null;

  const hotelsForCards = useMemo(() => {
    return (hotels || []).slice(0, 24).map((h) => ({
      ...h,
      citySlug: citySlugForLinks || h.citySlug,
    }));
  }, [hotels, citySlugForLinks]);

  if (!poiConfig) return <Navigate to="/404" replace />;

  return (
    <div className="min-h-screen bg-background">
      <JsonLd
        item={{
          "@context": "https://schema.org",
          "@type": "TouristDestination",
          "name": poiConfig.title.replace(/^Hotels Near\s+/i, ''),
          "description": metaDescription,
          "url": pageUrl,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": poiConfig.destination
          }
        }}
      />
      <JsonLd
        item={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://luxestayhaven.com"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": poiConfig.title,
              "item": pageUrl
            }
          ]
        }}
      />
      <JsonLd
        item={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": pageTitle,
          "description": metaDescription,
          "url": pageUrl,
          "mainEntity": {
            "@type": "ItemList",
            "itemListElement": hotelsForCards.map((hotel, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Hotel",
                "name": hotel.name,
                "description": hotel.description,
                "image": hotel.image,
                "url": `${SITE_ORIGIN}/hotel/${hotel.liteApiId || hotel.id}?city=${hotel.citySlug || ''}`,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": hotel.city || hotel.location,
                  "addressCountry": hotel.country
                },
                "priceRange": `$${hotel.price}`,
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": hotel.rating,
                  "reviewCount": hotel.reviews
                }
              }
            }))
          }
        }}
      />
      <JsonLd
        item={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": `What are the best hotels near ${poiConfig.title.replace(/^Hotels Near\s+/i, '')}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `LuxeStay compares prices from multiple providers to show the best hotels near ${poiConfig.title.replace(/^Hotels Near\s+/i, '')} in real time.`
              }
            },
            {
              "@type": "Question",
              "name": "Are LuxeStay prices cheaper?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, LuxeStay compares multiple booking providers to find the best available deals."
              }
            }
          ]
        }}
      />

      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />

        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />

        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="article" />
      </Helmet>

      <Header />

      <main className="pt-24 pb-20">
        <div className="container-luxury">
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h1 className="heading-display text-3xl md:text-5xl mb-4">{poiConfig.title}</h1>
            <p className="text-muted-foreground text-lg">{metaDescription}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {poiConfig.citySlug && (
                <Link to={`/hotels-in-${poiConfig.citySlug}`} className="btn-secondary">
                  Hotels in {titleCaseFromSlug(poiConfig.citySlug)}
                </Link>
              )}
              <Link to="/search" className="btn-primary">
                Open Search
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading hotels…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotelsForCards.map((hotel) => (
                <HotelCard key={hotel.liteApiId || hotel.id} hotel={hotel} />
              ))}
            </div>
          )}

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-display text-xl font-medium mb-3">Popular Searches</h2>
              <div className="flex flex-wrap gap-3">
                <Link to="/hotels-near-jfk" className="text-sm underline text-primary">Hotels near JFK</Link>
                <Link to="/hotels-near-eiffel-tower" className="text-sm underline text-primary">Hotels near Eiffel Tower</Link>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-display text-xl font-medium mb-3">More City Pages</h2>
              <div className="flex flex-wrap gap-3">
                <Link to="/hotels-in-paris" className="text-sm underline text-primary">Hotels in Paris</Link>
                <Link to="/hotels-in-london" className="text-sm underline text-primary">Hotels in London</Link>
                <Link to="/hotels-in-new-york" className="text-sm underline text-primary">Hotels in New York</Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PoiLandingPage;
