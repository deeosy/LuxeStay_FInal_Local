import React from 'react';

const UrgencyNote = ({ hasFreeCancellation, className = '' }) => {
  if (!hasFreeCancellation) {
    return (
      <p className={`text-xs text-muted-foreground mt-2 ${className}`}>
        Prices may increase — secure your rate now
      </p>
    );
  }

  return (
    <div className={`mt-2 space-y-1 ${className}`}>
      <p className="text-xs text-muted-foreground">
        Prices may increase — secure your rate now
      </p>
      <p className="text-xs text-emerald-700">
        Free cancellation on partner site (if available)
      </p>
    </div>
  );
};

export default UrgencyNote;

