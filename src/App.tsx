import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { initGA, trackPageView } from "@/utils/analytics";
import Home from "./pages/Home";
import SearchResults from "./pages/SearchResults";
import HotelDetail from "./pages/HotelDetail";
import Checkout from "./pages/Checkout";
import Register from "./pages/Register";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import DestinationPage from "./pages/DestinationPage";
import Destinations from "./pages/Destinations";
import CityCategoryPage from "./pages/CityCategoryPage";
import PoiLandingPage from "./pages/PoiLandingPage";

const queryClient = new QueryClient();

// Analytics wrapper to access router context
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

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
          <AnalyticsTracker />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/destinations" element={<Destinations />} />
            <Route path="/hotels-in/:citySlug" element={<DestinationPage />} />
            <Route path="/hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/best-hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/cheap-hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/luxury-hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/family-hotels-in-:citySlug" element={<DestinationPage />} />
            <Route path="/hotels-near-:poiSlug" element={<PoiLandingPage />} />
            <Route path="/hotels-in/:citySlug/:type" element={<CityCategoryPage />} />
            <Route path="/hotel/:id" element={<HotelDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/register" element={<Register />} />
            <Route path="/account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
