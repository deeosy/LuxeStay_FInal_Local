import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { featuredHotels, allHotels } from '@/data/hotels';
import {
  User,
  Settings,
  Heart,
  Calendar,
  CreditCard,
  LogOut,
  MapPin,
  Star,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import AuthGate from '@/components/auth/AuthGate';
import useFavoritesStore from '@/stores/useFavoritesStore';
import { supabase } from '@/integrations/supabase/client';
import useAuthStore from '@/stores/useAuthStore';
import { useSavedHotelIds } from '@/hooks/useSavedHotelIds';

const AccountContent = () => {
  const navigate = useNavigate();
  const [userEmail] = useState('');
  const authUser = useAuthStore((state) => state.user);
  const { savedHotelIds, loading } = useSavedHotelIds();
  const clearFavorites = useFavoritesStore((state) => state.clearFavorites);

  const userInfo = {
    name: 'Guest',
    email: authUser?.email || userEmail || 'user',
    memberSince: 'Member',
    avatar: null,
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearFavorites();
    navigate('/login');
  };

  const upcomingBookings = [
    {
      id: 1,
      hotel: featuredHotels[0],
      checkIn: 'Jan 15, 2026',
      checkOut: 'Jan 18, 2026',
      guests: 2,
      status: 'confirmed',
    },
  ];

  const pastBookings = [
    {
      id: 2,
      hotel: featuredHotels[3],
      checkIn: 'Nov 5, 2025',
      checkOut: 'Nov 8, 2025',
      guests: 2,
      status: 'completed',
    },
  ];

  const sidebarLinks = [
    { icon: User, label: 'Profile', active: true },
    { icon: Calendar, label: 'My Bookings', active: false },
    { icon: Heart, label: 'Saved Hotels', active: false },
    { icon: CreditCard, label: 'Payment Methods', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <>
      <main className="pt-24 pb-20">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-28">
                {/* User Info */}
                <div className="text-center mb-6 pb-6 border-b border-border">
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="font-medium text-lg">{userInfo.name}</h2>
                  <p className="text-sm text-muted-foreground mb-3">{userInfo.email}</p>
                  
                  {authUser && !authUser.email_confirmed_at ? (
                    <div className="mt-3 px-3 py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs rounded-md border border-yellow-500/20 text-left">
                       <div className="flex items-start gap-2 mb-1">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="font-semibold">Action Required</span>
                       </div>
                      Verify your email to update account details.
                    </div>
                  ) : (
                     <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium rounded-full border border-green-500/20">
                        <ShieldCheck className="w-3 h-3" /> Verified Member
                     </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-4">
                    Member since {userInfo.memberSince}
                  </p>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                  {sidebarLinks.map((link) => (
                    <button
                      key={link.label}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        link.active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.label}
                    </button>
                  ))}
                </nav>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Welcome */}
              <div className="bg-card border border-border rounded-xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div>
                    <h1 className="font-display text-2xl font-medium mb-2">
                      Welcome back, {userInfo.name.split(' ')[0]}!
                    </h1>
                    <p className="text-muted-foreground">
                      Manage your bookings, saved hotels, and account settings.
                    </p>
                   </div>
                   {authUser && !authUser.email_confirmed_at && (
                     <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 max-w-sm">
                        <div className="p-2 bg-blue-100 rounded-full shrink-0">
                           <ShieldCheck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                           <p className="text-sm font-semibold">Verify your account</p>
                           <p className="text-xs text-blue-700/80">Verified accounts get faster support & saved access.</p>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-display text-xl font-medium mb-6">
                  Upcoming Bookings
                </h2>
                {upcomingBookings.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex flex-col md:flex-row gap-4 p-4 bg-secondary/30 rounded-lg"
                      >
                        <img
                          src={booking.hotel.image}
                          alt={booking.hotel.name}
                          className="w-full md:w-32 h-24 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium">{booking.hotel.name}</h3>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                {booking.hotel.location}
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-accent/20 text-accent text-xs font-medium rounded-full capitalize">
                              {booking.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-3">
                            <span>Check-in: {booking.checkIn}</span>
                            <span>Check-out: {booking.checkOut}</span>
                            <span>{booking.guests} Guests</span>
                          </div>
                        </div>
                        <div className="flex md:flex-col gap-2">
                          <Link
                            to={`/hotel/${booking.hotel.id}`}
                            className="flex-1 text-center px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                    <Link to="/search" className="btn-primary text-sm">
                      Browse Hotels
                    </Link>
                  </div>
                )}
              </div>

              {/* Past Bookings */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-display text-xl font-medium mb-6">
                  Past Bookings
                </h2>
                {pastBookings.length > 0 ? (
                  <div className="space-y-4">
                    {pastBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex flex-col md:flex-row gap-4 p-4 bg-secondary/30 rounded-lg"
                      >
                        <img
                          src={booking.hotel.image}
                          alt={booking.hotel.name}
                          className="w-full md:w-32 h-24 rounded-lg object-cover opacity-75"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-medium">{booking.hotel.name}</h3>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                {booking.hotel.location}
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full capitalize">
                              {booking.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-3">
                            <span>{booking.checkIn} - {booking.checkOut}</span>
                            <span>{booking.guests} Guests</span>
                          </div>
                        </div>
                        <div className="flex md:flex-col gap-2">
                          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:shadow-gold transition-all">
                            <Star className="w-4 h-4" />
                            Review
                          </button>
                          <Link
                            to={`/hotel/${booking.hotel.id}`}
                            className="flex-1 text-center px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                          >
                            Book Again
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No past bookings
                  </p>
                )}
              </div>

              {/* Saved Hotels */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-medium">
                    Saved Hotels
                  </h2>
                  <Link
                    to="/search"
                    className="text-sm text-accent hover:underline"
                  >
                    Browse More
                  </Link>
                </div>

                {/* Step 78: Saved hotels revisit nudges */}
                {!loading && savedHotelIds.length > 0 && (
                   <div className="mb-6 flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      <span>Prices may change — check availability before rooms sell out.</span>
                   </div>
                )}

                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading saved hotels...</p>
                ) : savedHotelIds.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-lg bg-secondary/10">
                    <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-border">
                      <Heart className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-lg mb-2">No saved hotels yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                      Start exploring amazing destinations and save your favorite stays for later.
                    </p>
                    
                    {/* Step 80: Auth-aware empty state actions */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link to="/search" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                        Search by city
                      </Link>
                      <Link to="/search?sort=rating" className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                        View top rated
                      </Link>
                      <Link to="/search?sort=price" className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                        Browse best value
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedHotelIds.map((hotelId) => {
                      const hotel =
                        allHotels.find((h) => String(h.id) === String(hotelId)) || null;

                      if (!hotel) {
                        return (
                          <div
                            key={hotelId}
                            className="flex gap-4 p-3 rounded-lg border border-border"
                          >
                            <div className="flex-1">
                              <h3 className="font-medium text-sm mb-1">
                                Saved Hotel #{hotelId}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                This hotel was saved from a live search result.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={hotelId}
                          to={`/hotel/${hotel.id}`}
                          className="flex gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                        >
                          <img
                            src={hotel.image}
                            alt={hotel.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="font-medium text-sm mb-1 group-hover:text-accent transition-colors">{hotel.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <MapPin className="w-3 h-3" />
                              {hotel.location}
                            </div>
                            
                            {/* Step 79: Price anchoring */}
                            {hotel.price ? (
                              <p className="text-sm font-medium">
                                <span className="text-xs text-muted-foreground font-normal">From </span>
                                ${hotel.price}
                                <span className="text-xs text-muted-foreground font-normal">
                                  /night
                                </span>
                              </p>
                            ) : (
                              <span className="text-sm font-medium text-accent">
                                Check availability
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

const Account = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AuthGate>
        <AccountContent />
      </AuthGate>
      <Footer />
    </div>
  );
};

export default Account;
