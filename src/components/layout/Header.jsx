import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, User, Search } from 'lucide-react';
import useAuthStore from '@/stores/useAuthStore';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Hotels', path: '/search' },
    { name: 'Destinations', path: '/destinations' },
    { name: 'About', path: '/' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container-luxury">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
              LuxeStay
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => navigate('/search')}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            {user ? (
              <Link
                to="/account"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                to="/register"
                className="btn-primary text-sm"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex gap-4 mt-4 pt-4 border-t border-border">
                {user ? (
                  <Link
                    to="/account"
                    className="flex-1 text-center py-2 border border-border rounded-md text-sm font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Account
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    className="flex-1 text-center py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
