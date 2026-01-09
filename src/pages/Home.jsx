import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSearch from '@/components/HeroSearch';
import FeaturedHotels from '@/components/FeaturedHotels';
import Stats from '@/components/Stats';
import heroImage from '@/assets/hero-hotel.jpg';
import { ArrowRight, Shield, Clock, Award } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/40 to-foreground/60" />

        <div className="relative z-10 container-luxury text-center py-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in">
              <div className="flex -space-x-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="w-4 h-4 text-accent"
                    style={{ filter: 'drop-shadow(0 0 2px hsl(38 65% 50% / 0.5))' }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-card/80 font-medium">(5.0)</span>
            </div>

            <p className="text-sm uppercase tracking-[0.3em] text-card/70 mb-4 animate-fade-in animation-delay-100">
              ◆ Modern Luxury and Timeless Living
            </p>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-medium text-card mb-8 leading-tight animate-slide-up animation-delay-200">
              Welcome to Our Luxurious
              <br />
              <span className="italic">Hotel & Resort</span>
            </h1>

            <p className="text-lg text-card/80 max-w-2xl mx-auto mb-10 animate-fade-in animation-delay-300">
              Discover exceptional stays at the world's most exclusive destinations.
              From beachfront villas to urban sanctuaries, your perfect escape awaits.
            </p>

            <div className="animate-slide-up animation-delay-400">
              <HeroSearch />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-card/50 animate-fade-in animation-delay-400">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-card/30" />
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-background">
        <div className="container-luxury">
          <div className="max-w-4xl mx-auto text-center">
            <p className="section-title">About Us</p>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
              Since 2016, we've been helping travelers find stays they love — effortlessly.
              We're about curating unforgettable journeys! Our passionate team has been helping
              travelers find the perfect stay, blending seamless technology with a love for discovery.
              From cozy hideaways to grand escapes, we turn your travel dreams into real-world adventures.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-accent transition-colors group"
            >
              Know More
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <Stats />

      {/* Featured Hotels */}
      <FeaturedHotels />

      {/* Why Choose Us */}
      <section className="py-20 bg-background">
        <div className="container-luxury">
          <div className="text-center mb-12">
            <p className="section-title">Why Choose Us</p>
            <h2 className="heading-display text-3xl md:text-4xl">
              Everything You Need to Know
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Best Price Guarantee',
                description: 'Find a lower price? We\'ll match it and give you an additional 10% off your booking.',
              },
              {
                icon: Clock,
                title: '24/7 Concierge',
                description: 'Our dedicated team is available around the clock to assist with any requests or changes.',
              },
              {
                icon: Award,
                title: 'Curated Selection',
                description: 'Every hotel is personally vetted to ensure it meets our exceptional quality standards.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="text-center p-8 rounded-lg border border-border hover:border-accent/30 hover:shadow-luxury-md transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display text-xl font-medium mb-3">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container-luxury">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-medium text-primary-foreground mb-6">
              Ready to Plan Your Next Escape?
            </h2>
            <p className="text-lg text-primary-foreground/70 mb-8">
              Join thousands of travelers who trust LuxeStay for their luxury accommodations worldwide.
            </p>
            <Link
              to="/search"
              className="btn-accent inline-block"
            >
              Explore Hotels
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
