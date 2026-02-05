import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import useBookingStore from '@/stores/useBookingStore';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const BookingConfirmation = () => {
  const { bookingSummary, clearBooking } = useBookingStore();

  const summary = bookingSummary || {};
  const hotelName = summary?.hotel?.name || 'Your Hotel';
  const confirmationCode = summary?.confirmationCode || summary?.code || 'N/A';
  const checkIn = summary?.checkIn || summary?.checkin || '';
  const checkOut = summary?.checkOut || summary?.checkout || '';
  const price = summary?.price?.total || summary?.total || null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container-luxury max-w-2xl text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-green-100 rounded-full text-green-700">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>
          <h1 className="heading-display text-3xl md:text-4xl mb-2">Booking Confirmed</h1>
          <p className="text-muted-foreground mb-8">
            Thank you! Your reservation has been secured.
          </p>

          <div className="bg-card border border-border rounded-xl p-6 text-left">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hotel</span>
                <span className="font-medium">{hotelName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmation Code</span>
                <span className="font-medium">{confirmationCode}</span>
              </div>
              {checkIn && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-medium">{checkIn}</span>
                </div>
              )}
              {checkOut && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium">{checkOut}</span>
                </div>
              )}
              {price && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-medium">${Math.ceil(price)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              to="/"
              className="btn-primary"
              onClick={() => clearBooking()}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookingConfirmation;
