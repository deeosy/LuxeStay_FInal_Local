import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { initGA, trackPageView } from "@/utils/analytics";
import { supabase } from "@/integrations/supabase/client";
import useAuthStore from "@/stores/useAuthStore";
import Home from "./pages/Home";
import SearchResults from "./pages/SearchResults";
import HotelDetail from "./pages/HotelDetail";
import Checkout from "./pages/Checkout";
import Register from "./pages/Register";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import DestinationPage from "./pages/DestinationPage";
import Destinations from "./pages/Destinations";
import TopCities from "./pages/TopCities";
import CityCategoryPage from "./pages/CityCategoryPage";
import PoiLandingPage from "./pages/PoiLandingPage";
import AdminAffiliate from "./pages/AdminAffiliate";
import CityHotels from "./pages/CityHotels";

const queryClient = new QueryClient();


// Analytics and auth wrapper to access router context
const AppLifecycle = () => {
  const location = useLocation();
  const setAuthState = useAuthStore((state) => state.setAuthState);
  const loadSavedHotelIds = useAuthStore((state) => state.loadSavedHotelIds);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    if (user && !user.email_confirmed_at) {
      toast("Please verify your email to unlock all features.");
    }
  }, [user]);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setAuthState({
        user: session?.user || null,
        session: session || null,
      });

      if (session?.user?.id) {
        loadSavedHotelIds(session.user.id);
      } else {
        loadSavedHotelIds(null);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setAuthState({
        user: session?.user || null,
        session: session || null,
      });

      if (session?.user?.id) {
        loadSavedHotelIds(session.user.id);
      } else {
        loadSavedHotelIds(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setAuthState, loadSavedHotelIds]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Helmet>
          <meta name="google-site-verification" content="V7hMVeeewDdVS_fCmeVY7VIi___MzYDAttHj9zodV48" />
          <meta name="msvalidate.01" content={import.meta.env.VITE_BING_MSVALIDATE_01} />
        </Helmet>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLifecycle />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/top-cities" element={<TopCities />} />
            <Route path="/hotels/:citySlug" element={<CityHotels />} />
            <Route path="/hotels/:citySlug/:filterSlug" element={<CityHotels />} />
            <Route path="/hotels-in/:citySlug" element={<DestinationPage />} />
            <Route path="/hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/hotels-in-:citySlug-:districtSlug" element={<DestinationPage />} />
            <Route path="/best-hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/cheap-hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/luxury-hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/family-hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/hotels-near-:nearbyCitySlug-from-:citySlug" element={<DestinationPage />} />
            <Route path="/hotels-near-:poiSlug" element={<PoiLandingPage />} />
            <Route path="/hotels-in/:citySlug/:type" element={<CityCategoryPage />} />
            <Route path="/hotel/:id" element={<HotelDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Register />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin/affiliate" element={<AdminAffiliate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
