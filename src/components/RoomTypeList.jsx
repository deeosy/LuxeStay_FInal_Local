import React, { useState } from 'react';
import { 
  Users, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  CalendarCheck, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  BedDouble,
  Maximize,
  Image as ImageIcon
} from 'lucide-react';

const RoomTypeList = ({ roomTypes, hotelImages, selectedRateId, onSelectRate }) => {
  const [expandedRooms, setExpandedRooms] = useState({});
  const [imageIndices, setImageIndices] = useState({});

  if (!roomTypes || roomTypes.length === 0) {
    return null;
  }

  const toggleRoom = (index) => {
    setExpandedRooms(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

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
      <h2 className="font-display text-3xl font-medium mb-6">Choose your perfect room</h2>
      
      <div className="space-y-6">
        {roomTypes.map((room, index) => {
          const isExpanded = expandedRooms[index];
          const currentImageIndex = imageIndices[index] || 0;
          
          // Image Logic: Room images -> Hotel images -> Placeholder
          const roomImages = room.images && room.images.length > 0 ? room.images : (hotelImages || []);
          const displayImages = roomImages.slice(0, 5); // Limit to 5 images
          const hasMultipleImages = displayImages.length > 1;

         // Rate Logic - UPDATED: Using spread [...] to prevent original data mutation
         const sortedRates = [...(room.rates || [])].sort((a, b) => {
            const priceA = a.retailRate?.total?.[0]?.amount || Infinity;
            const priceB = b.retailRate?.total?.[0]?.amount || Infinity;
            return priceA - priceB;
         });
          
          const cheapestRate = sortedRates[0];
          const cheapestPrice = cheapestRate?.retailRate?.total?.[0]?.amount;
          
          return (
            <div key={index} className="border border-border rounded-xl bg-card shadow-sm hover:shadow-luxury-sm transition-shadow overflow-hidden group">
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
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />

                        {/* Controls */}
                        {hasMultipleImages && (
                          <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                               onClick={(e) => prevImage(e, index, displayImages.length)}
                               className="p-1.5 rounded-full bg-white/90 text-black shadow-sm hover:bg-white hover:scale-110 transition-all"
                             >
                               <ChevronLeft className="w-4 h-4" />
                             </button>
                             <button 
                               onClick={(e) => nextImage(e, index, displayImages.length)}
                               className="p-1.5 rounded-full bg-white/90 text-black shadow-sm hover:bg-white hover:scale-110 transition-all"
                             >
                               <ChevronRight className="w-4 h-4" />
                             </button>
                          </div>
                        )}
                        
                        {/* Image Counter Badge */}
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
                <div className="flex-1 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
                   <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-display text-xl font-medium">{room.name}</h3>
                      </div>

                      {/* Key Specs */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                         {room.maxOccupancy && (
                           <div className="flex items-center gap-1.5" title="Max Occupancy">
                             <Users className="w-4 h-4" />
                             <span>Up to {room.maxOccupancy}</span>
                           </div>
                         )}
                         {/* Fake data for Bed/Size if missing (API usually doesn't send these in list view easily) */}
                         {/* We can conditionally render if we had them */}
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
                           {room.amenities.slice(0, 4).map((amenity, i) => (
                             <span key={i} className="text-xs text-secondary-foreground/80 flex items-start gap-1.5">
                               <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> 
                               <span className="line-clamp-1">{amenity}</span>
                             </span>
                           ))}
                        </div>
                      )}
                      
                      {room.amenities && room.amenities.length > 4 && (
                        <button 
                          className="text-xs text-primary font-medium mt-3 hover:underline"
                          onClick={() => toggleRoom(index)}
                        >
                          +{room.amenities.length - 4} more amenities
                        </button>
                      )}
                   </div>
                </div>

                {/* 3. Pricing & Default Rate Section */}
                <div className="w-full md:w-1/3 p-6 bg-secondary/5 flex flex-col justify-center">
                   {cheapestRate ? (
                     <div className="space-y-4">
                        {/* Display the CHEAPEST rate details by default */}
                        <div className="flex items-baseline justify-between md:justify-end gap-1 mb-1">
                           <span className="text-sm text-muted-foreground">From</span>
                           <span className="font-display font-bold text-2xl text-foreground">
                             ${Math.ceil(cheapestPrice).toLocaleString()}
                           </span>
                           <span className="text-xs text-muted-foreground">/night</span>
                        </div>

                        {/* Badges for the cheapest rate */}
                        <div className="flex flex-col gap-2 items-end">
                           {(cheapestRate.cancellationPolicies?.length > 0) && (
                              <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md flex items-center gap-1.5">
                                <CalendarCheck className="w-3 h-3" /> Free Cancellation
                              </span>
                           )}
                           {(cheapestRate.boardBasis?.type === 'Breakfast' || cheapestRate.name?.toLowerCase().includes('breakfast')) && (
                              <span className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded-md flex items-center gap-1.5">
                                <Utensils className="w-3 h-3" /> Breakfast Included
                              </span>
                           )}
                        </div>
                        
                        <button 
                           onClick={() => toggleRoom(index)}
                           className="w-full mt-4 btn-secondary flex items-center justify-center gap-2"
                        >
                           {isExpanded ? 'Hide Rates' : `View ${room.rates.length} Rates`}
                           {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                     </div>
                   ) : (
                      <div className="text-center text-muted-foreground text-sm">
                         No rates available
                      </div>
                   )}
                </div>

              </div>

              {/* 4. EXPANDED RATES TABLE */}
              {isExpanded && sortedRates.length > 0 && (
                <div className="border-t border-border bg-card animate-in slide-in-from-top-2 duration-300">
                   <div className="p-4 md:p-6 bg-secondary/5">
                      <h4 className="font-medium text-sm text-muted-foreground mb-4 uppercase tracking-wider">Select a Rate Plan</h4>
                      <div className="space-y-3">
                         {sortedRates.map((rate, rIndex) => {
                             const priceObj = rate.retailRate?.total?.[0];
                             const price = priceObj?.amount;
                             const rateId = rate.id || `${room.id}-${rIndex}`;
                             const isSelected = selectedRateId === rateId;

                             // Badge Logic
                             const hasFreeCancellation = rate.cancellationPolicies && rate.cancellationPolicies.length > 0;
                             const hasBreakfast = rate.boardBasis?.type === 'Breakfast' || rate.name?.toLowerCase().includes('breakfast');

                             return (
                               <div 
                                 key={rIndex}
                                 onClick={() => price && onSelectRate && onSelectRate(rateId, price, rate.name)}
                                 className={`
                                    relative flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border cursor-pointer transition-all
                                    ${isSelected 
                                       ? 'bg-white border-primary ring-1 ring-primary shadow-md z-10' 
                                       : 'bg-white border-border hover:border-primary/40 hover:shadow-sm'
                                    }
                                 `}
                               >
                                  {/* Rate Name & Policies */}
                                  <div className="w-full md:w-1/2 mb-4 md:mb-0">
                                     <div className="flex items-center gap-3">
                                        <span className="font-medium text-base">{rate.name || "Standard Rate"}</span>
                                        {isSelected && (
                                           <span className="text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                              Selected
                                           </span>
                                        )}
                                     </div>
                                     <div className="flex flex-wrap gap-2 mt-2">
                                        {hasFreeCancellation && (
                                           <span className="text-xs text-green-600 flex items-center gap-1">
                                             <CalendarCheck className="w-3 h-3" /> Free Cancellation
                                           </span>
                                        )}
                                        {hasBreakfast && (
                                           <span className="text-xs text-orange-600 flex items-center gap-1">
                                             <Utensils className="w-3 h-3" /> Breakfast Included
                                           </span>
                                        )}
                                        {!hasFreeCancellation && !hasBreakfast && (
                                           <span className="text-xs text-muted-foreground flex items-center gap-1">
                                              <Info className="w-3 h-3" /> Standard Terms
                                           </span>
                                        )}
                                     </div>
                                  </div>

                                  {/* Price & Action */}
                                  <div className="w-full md:w-1/2 flex items-center justify-between md:justify-end gap-6">
                                     {price ? (
                                        <div className="text-right">
                                           <div className="flex items-baseline justify-end gap-1">
                                              {/* <span className="font-display font-bold text-xl">${Math.ceil(price).toLocaleString()}</span> */}
                                              <span className="font-display font-bold text-xl">${price}</span>
                                           </div>
                                           <span className="text-xs text-muted-foreground">per night</span>
                                        </div>
                                     ) : (
                                        <span className="text-sm text-muted-foreground">Check dates</span>
                                     )}

                                     <button 
                                        className={`
                                           min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm
                                           ${isSelected 
                                              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                              : 'bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground'
                                           }
                                        `}
                                     >
                                        {isSelected ? 'Selected' : 'Select'}
                                     </button>
                                  </div>
                               </div>
                             );
                         })}
                      </div>
                   </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomTypeList;