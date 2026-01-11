import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cities } from '@/data/cities';
import { MapPin, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

const Destinations = () => {
  // SEO Meta Tags
  useEffect(() => {
    document.title = "Hotel Destinations | LuxeStay";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = "Browse luxury hotels by destination. Find the best hotel deals in Paris, London, Dubai, New York and more.";
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Browse luxury hotels by destination. Find the best hotel deals in Paris, London, Dubai, New York and more.";
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 pt-24 pb-20"> 
        <div className="container-luxury">
          <div className="">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Destinations</span>
            </nav>
          </div>

          <div className="max-w-4xl mb-12 ">
            <h1 className="heading-display text-3xl md:text-4xl mb-2">
              Hotel Destinations
            </h1>
            <h2 className="text-gray-600">
              Browse hotels by city
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {cities.map((city) => (
              <div key={city.citySlug} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 flex flex-col h-full">
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{city.cityName}</h3>
                      <p className="text-gray-500 font-medium flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {city.country}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6 line-clamp-3 flex-grow">
                    {city.shortIntro}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {city.travelTags?.slice(0, 3).map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Link 
                    to={`/hotels-in/${city.citySlug}`}
                    className="w-full mt-auto bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    View Hotels
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>


      </main>

      <Footer />
    </div>
  );
};

export default Destinations;
