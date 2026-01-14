import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEOFooter from '@/components/SEOFooter';
import { cities } from '@/data/cities';
import { Helmet } from 'react-helmet';

const TopCities = () => {
  // In a real scenario, we would sort by revenue potential (EPC * Volume) from Supabase.
  // For now, we assume the 'cities' list is roughly ordered by importance or we randomize/sort by popularity.
  // Since this is a static page generation request, we'll render the static list.
  
  const sortedCities = [...cities].sort((a, b) => a.cityName.localeCompare(b.cityName));

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Top 100 Cities for Luxury Hotels | LuxeStayHaven</title>
        <meta name="description" content="Browse our comprehensive list of top destinations for luxury travel. Find the best hotels in Paris, London, New York, Dubai, and more." />
        <link rel="canonical" href="https://luxestayhaven.com/top-cities" />
      </Helmet>

      <Header />

      <main className="pt-24 pb-20 container-luxury">
        <div className="text-center mb-16">
          <h1 className="heading-display text-4xl md:text-5xl mb-6">
            Top Travel Destinations
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore our curated collection of luxury accommodations in the world's most exciting cities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {sortedCities.map((city) => (
            <div key={city.citySlug} className="flex flex-col space-y-2 p-4 border rounded-lg hover:shadow-md transition-shadow">
              <Link 
                to={`/hotels-in/${city.citySlug}`}
                className="text-lg font-bold text-primary hover:underline"
              >
                Hotels in {city.cityName}
              </Link>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <Link to={`/best-hotels-in-${city.citySlug}`} className="hover:text-foreground">Best</Link>
                <span>•</span>
                <Link to={`/cheap-hotels-in-${city.citySlug}`} className="hover:text-foreground">Cheap</Link>
                <span>•</span>
                <Link to={`/luxury-hotels-in-${city.citySlug}`} className="hover:text-foreground">Luxury</Link>
                <span>•</span>
                <Link to={`/family-hotels-in-${city.citySlug}`} className="hover:text-foreground">Family</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 bg-gray-50 rounded-xl">
          <h2 className="text-2xl font-bold mb-4">Why Book with LuxeStay?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Curated Selection</h3>
              <p className="text-sm text-gray-600">We verify every hotel to ensure it meets our high standards.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Best Price Guarantee</h3>
              <p className="text-sm text-gray-600">We match any price and offer exclusive member deals.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-sm text-gray-600">Our concierge team is always available to help.</p>
            </div>
          </div>
        </div>
      </main>

      <SEOFooter />
      <Footer />
    </div>
  );
};

export default TopCities;
