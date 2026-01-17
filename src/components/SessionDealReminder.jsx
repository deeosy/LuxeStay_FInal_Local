import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, X, ArrowRight } from 'lucide-react';

const SessionDealReminder = () => {
  const [visible, setVisible] = useState(false);
  const [hotel, setHotel] = useState(null);

  useEffect(() => {
    // Check if we have a recently viewed hotel that wasn't booked
    const lastViewedRaw = sessionStorage.getItem('lsh_last_viewed');
    
    if (!lastViewedRaw) return;

    try {
      const lastViewed = JSON.parse(lastViewedRaw);
      
      // Check if we already showed a reminder for this specific hotel
      const reminderShownKey = `lsh_reminder_shown_${lastViewed.id}`;
      if (sessionStorage.getItem(reminderShownKey)) return;

      // Check if the user actually clicked "Book" for this hotel (conversion)
      // We'll handle the clearing of 'lsh_last_viewed' on booking click in HotelDetail,
      // but as a fallback, we can check if it exists.
      
      setHotel(lastViewed);
      setVisible(true);

      // Mark as shown so we don't spam the user for the same hotel
      sessionStorage.setItem(reminderShownKey, 'true');

    } catch (e) {
      console.error('Error parsing session reminder data', e);
    }
  }, []);

  if (!visible || !hotel) return null;

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up max-w-sm w-full mx-4 md:mx-0">
      <div className="bg-card border border-accent/20 shadow-luxury-lg rounded-lg p-4 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss reminder"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pl-2">
          <div className="p-2 bg-accent/10 rounded-full shrink-0">
            <History className="w-5 h-5 text-accent" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              Still considering {hotel.name}?
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Prices in {hotel.city || 'this area'} change frequently. Check availability again before it's gone.
            </p>
            
            <Link 
              to={`/hotel/${hotel.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Back to Hotel <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDealReminder;
