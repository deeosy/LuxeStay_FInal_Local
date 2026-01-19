import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Instagram, Facebook, Twitter } from 'lucide-react';
import { cities } from '@/data/cities';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    discover: cities.map(city => ({
      name: `Hotels in ${city.cityName}`,
      path: `/hotels-in/${city.citySlug}`
    })),
    company: [
      { name: 'About Us', path: '/' },
      { name: 'Careers', path: '/' },
      { name: 'Press', path: '/' },
      { name: 'Partners', path: '/' },
    ],
    support: [
      { name: 'Help Center', path: '/' },
      { name: 'Contact Us', path: '/' },
      { name: 'Privacy Policy', path: '/' },
      { name: 'Terms of Service', path: '/' },
    ],
  }; 

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-luxury py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <span className="font-display text-2xl font-semibold tracking-tight">
                LuxeStay
              </span>
            </Link>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-6 max-w-sm">
              Discover the world's most extraordinary hotels and resorts. 
              We curate unforgettable stays for discerning travelers seeking 
              authentic luxury experiences.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                rel="nofollow noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                rel="nofollow noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                rel="nofollow noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h4 className="font-medium mb-6 text-sm uppercase tracking-wider">
              Discover
            </h4>
            <ul className="space-y-3">
              {footerLinks.discover.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-medium mb-6 text-sm uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-medium mb-6 text-sm uppercase tracking-wider">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-primary-foreground/70">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>123 Luxury Avenue, New York, NY 10001</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-primary-foreground/70">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>+1 (800) 555-LUXE</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-primary-foreground/70">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>hello@luxestayhaven.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-primary-foreground/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/50">
              © {currentYear} LuxeStay. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                to="/"
                className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/"
                className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/"
                className="text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
