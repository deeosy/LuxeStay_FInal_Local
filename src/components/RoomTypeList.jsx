import React, { useState } from 'react';
import { 
  Users, 
  Check, 
  Utensils, 
  CalendarCheck, 
  ChevronLeft, 
  ChevronRight,
  BedDouble,
  Maximize,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';

const RoomTypeList = ({ roomTypes, hotelImages, selectedOffer, onSelectOffer, hotelId }) => {
  const [imageIndices, setImageIndices] = useState({});

  if (!roomTypes || roomTypes.length === 0) {
    return null;
  }

  const nextImage = (e, roomIndex, totalImages) => {
    e.stopPropagation();
    setImageIndices(prev => ({
      ...prev,
      [roomIndex]: ((prev[roomIndex] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (e, roomIndex, totalImages) => {
    e.stopPropagation();
    setImageIndices(prev => ({
      ...prev,
      [roomIndex]: ((prev[roomIndex] || 0) - 1 + totalImages) % totalImages
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in mt-12 pt-8 border-t border-border" id="room-types">
      <h2 className="font-display text-3xl font-medium mb-6">Choose your room rate</h2>
      
      <div className="space-y-6">
        {roomTypes.map((room, roomIndex) => {
          const currentImageIndex = imageIndices[roomIndex] || 0;
          
          // Image Logic: Room images -> Hotel images -> Placeholder
          const roomImages = room.images && room.images.length > 0 ? room.images : (hotelImages || []);
          const displayImages = roomImages.slice(0, 5);
          const hasMultipleImages = displayImages.length > 1;

          // Sort rates by price
          const sortedRates = [...(room.rates || [])].sort((a, b) => {
            const priceA = a.retailRate?.total?.[0]?.amount || Infinity;
            const priceB = b.retailRate?.total?.[0]?.amount || Infinity;
            return priceA - priceB;
          });
          
          return (
            <div 
              key={roomIndex} 
              className="border rounded-xl bg-card shadow-sm transition-all overflow-hidden border-border hover:shadow-luxury-sm"
            >
              <div className="flex flex-col md:flex-row h-full">
                
                {/* 1. Image Carousel Section */}
                <div className="w-full md:w-1/3 relative h-64 md:h-auto min-h-[250px] bg-secondary/10">
                  {displayImages.length > 0 ? (
                    <>
                      <img 
                        src={displayImages[currentImageIndex]} 
                        alt={`${room.name} view ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover absolute inset-0 transition-opacity duration-500"
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />

                      {hasMultipleImages && (
                        <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => prevImage(e, roomIndex, displayImages.length)}
                            className="p-1.5 rounded-full bg-white/90 text-black shadow-sm hover:bg-white hover:scale-110 transition-all"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => nextImage(e, roomIndex, displayImages.length)}
                            className="p-1.5 rounded-full bg-white/90 text-black shadow-sm hover:bg-white hover:scale-110 transition-all"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      {hasMultipleImages && (
                        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                          {currentImageIndex + 1} / {displayImages.length}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/20">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs">No image available</span>
                    </div>
                  )}
                </div>

                {/* 2. Room Details Section */}
                <div className="flex-1 p-6 flex flex-col border-b md:border-b-0 md:border-r border-border">
                  <div className="mb-4">
                    <h3 className="font-display text-xl font-medium mb-2">{room.name}</h3>

                    {/* Key Specs */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      {room.maxOccupancy && (
                        <div className="flex items-center gap-1.5" title="Max Occupancy">
                          <Users className="w-4 h-4" />
                          <span>Up to {room.maxOccupancy}</span>
                        </div>
                      )}
                      {room.bedType && (
                        <div className="flex items-center gap-1.5">
                          <BedDouble className="w-4 h-4" />
                          <span>{room.bedType}</span>
                        </div>
                      )}
                      {room.size && (
                        <div className="flex items-center gap-1.5">
                          <Maximize className="w-4 h-4" />
                          <span>{room.size} m²</span>
                        </div>
                      )}
                    </div>

                    {/* Amenities Grid */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                        {room.amenities.slice(0, 6).map((amenity, i) => (
                          <span key={i} className="text-xs text-secondary-foreground/80 flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> 
                            <span className="line-clamp-1">{amenity}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Rates Selection Section */}
                <div className="w-full md:w-1/3 bg-secondary/5 flex flex-col">
                  {sortedRates.length > 0 ? (
                    <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-3">
                      {sortedRates.map((rate, rateIndex) => {
                        const price = rate.retailRate?.total?.[0]?.amount || 0;
                        const currency = rate.retailRate?.total?.[0]?.currency || 'USD';
                        // Fix: use rate.offerId, not room.offerId
                        const isSelected = selectedOffer?.offerId === rate.offerId;
                        // Fix: Check refundableTag correctly based on user spec
                        const isRefundable = rate.cancellationPolicies?.refundableTag === 'RFN';
                        
                        return (
                          <div 
                            key={rateIndex}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              isSelected 
                                ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                                : 'border-border bg-card hover:border-primary/50'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                onSelectOffer(null); 
                              } else {
                                onSelectOffer({
                                  offerId: rate.offerId, // Fix: use rate.offerId
                                  hotelId: hotelId,
                                  mappedRoomId: room.mappedRoomId,
                                  roomName: room.name,
                                  boardName: rate.boardBasis?.description || 'Room Only',
                                  refundableTag: isRefundable ? 'RFN' : 'NRFN',
                                  price: { amount: price, currency: currency }
                                });
                              }
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium text-sm">
                                  {rate.boardBasis?.description || 'Room Only'}
                                </div>
                                <div className={`text-xs mt-1 ${
                                  isRefundable ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {isRefundable ? 'Free Cancellation' : 'Non-refundable'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">
                                  ${Math.ceil(price).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-muted-foreground">Total</div>
                              </div>
                            </div>
                            
                            <div className={`w-full py-1.5 rounded text-xs font-medium text-center transition-colors ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-secondary text-secondary-foreground group-hover:bg-secondary/80'
                            }`}>
                              {isSelected ? 'Selected' : 'Select'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6">
                      No rates available
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomTypeList;