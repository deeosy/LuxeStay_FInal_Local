import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Grid, Expand, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const HotelGallery = ({ images = [], hotelName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHoveringHero, setIsHoveringHero] = useState(false);

  // Ensure we have a valid array of images
  const galleryImages = images.length > 0 ? images : ['/placeholder.jpg'];

  // Auto-slide hero logic
  useEffect(() => {
    if (isHoveringHero || isModalOpen) return;
    
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % galleryImages.length);
    }, 6000);
    
    return () => clearInterval(interval);
  }, [galleryImages.length, isHoveringHero, isModalOpen]);

  // Modal Keyboard Navigation
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') navigateModal(-1);
      if (e.key === 'ArrowRight') navigateModal(1);
      if (e.key === 'Escape') setIsModalOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const navigateModal = useCallback((direction) => {
    setCurrentImageIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return galleryImages.length - 1;
      if (next >= galleryImages.length) return 0;
      return next;
    });
  }, [galleryImages.length]);

  const openModal = (index = 0) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  // Prepare display images
  const heroImage = galleryImages[heroIndex];
  // Right side images (up to 4, skipping the current hero if possible, or just fixed indices 1-4)
  // To keep the layout stable, let's use fixed indices 1, 2, 3, 4 for the right side
  // If we don't have enough images, we'll repeat or hide.
  const sideImages = galleryImages.filter((_, i) => i !== heroIndex).slice(0, 4);

  return (
    <>
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 h-[400px] md:h-[500px] rounded-xl overflow-hidden mb-8 relative group">
        
        {/* Left: Hero Image (Span 2 cols on large, full on mobile) */}
        <div 
          className="lg:col-span-2 h-full relative overflow-hidden cursor-pointer"
          onMouseEnter={() => setIsHoveringHero(true)}
          onMouseLeave={() => setIsHoveringHero(false)}
          onClick={() => openModal(heroIndex)}
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300 z-10" />
          
          {/* Animated Hero Image */}
          <img
            key={heroIndex} // Key change triggers animation restart
            src={heroImage}
            alt={`${hotelName} - Hero`}
            className="w-full h-full object-cover animate-ken-burns"
          />
          
          {/* Slide Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {galleryImages.slice(0, 5).map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  idx === heroIndex % 5 ? "w-6 bg-white" : "w-1.5 bg-white/50"
                )}
              />
            ))}
          </div>
        </div>

        {/* Right: 4 Stacked Images (2x2 Grid) */}
        <div className="hidden lg:grid grid-cols-2 lg:col-span-2 gap-2 h-full">
          {sideImages.map((img, idx) => (
            <div 
              key={idx} 
              className="relative overflow-hidden cursor-pointer group/item h-full"
              onClick={() => openModal(galleryImages.indexOf(img))}
            >
              <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors duration-300 z-10" />
              <img
                src={img}
                alt={`${hotelName} - Preview ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
              />
            </div>
          ))}
          
          {/* Fallback/Placeholder if not enough images */}
          {Array.from({ length: Math.max(0, 4 - sideImages.length) }).map((_, idx) => (
             <div key={`placeholder-${idx}`} className="bg-secondary/20 h-full w-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
             </div>
          ))}
        </div>

        {/* "Show all photos" Button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 z-20 shadow-lg font-medium gap-2 hidden md:flex"
          onClick={(e) => {
            e.stopPropagation();
            openModal(0);
          }}
        >
          <Grid className="w-4 h-4" />
          Show all photos
        </Button>
      </div>

      {/* Fullscreen Modal Gallery */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 text-white z-10">
            <span className="text-sm font-medium tracking-wide">
              {currentImageIndex + 1} / {galleryImages.length}
            </span>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Stage */}
          <div className="flex-1 relative flex items-center justify-center p-4 md:p-12 overflow-hidden group">
            {/* Main Image */}
            <div className="relative w-full h-full max-w-7xl flex items-center justify-center">
               <img
                src={galleryImages[currentImageIndex]}
                alt={`${hotelName} - Fullscreen ${currentImageIndex + 1}`}
                className="max-h-full max-w-full object-contain shadow-2xl rounded-sm animate-in zoom-in-95 duration-300"
              />
            </div>

            {/* Nav Arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); navigateModal(-1); }}
              className="absolute left-4 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all hover:scale-110 focus:outline-none"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigateModal(1); }}
              className="absolute right-4 p-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-all hover:scale-110 focus:outline-none"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>

          {/* Thumbnail Strip */}
          <div className="h-20 md:h-24 bg-black/80 backdrop-blur-md border-t border-white/10 p-4 flex items-center justify-center gap-3 overflow-x-auto no-scrollbar">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={cn(
                  "relative w-16 md:w-24 h-full flex-shrink-0 rounded-md overflow-hidden transition-all duration-300",
                  currentImageIndex === idx 
                    ? "ring-2 ring-white opacity-100 scale-105" 
                    : "opacity-40 hover:opacity-70 hover:scale-105"
                )}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default HotelGallery;
