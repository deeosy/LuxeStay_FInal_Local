import React from 'react';

const PriceAnchor = ({ price, className = '', showSuffix = true, size = 'md' }) => {
  if (!price || price <= 0) return null;

  const anchorPrice = Math.round(price * 1.18);
  const valueClass =
    size === 'lg'
      ? 'font-display text-3xl font-semibold'
      : size === 'sm'
      ? 'font-display text-lg font-semibold'
      : 'font-display text-xl font-semibold';

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="text-xs md:text-sm text-muted-foreground line-through">
        ${anchorPrice}
      </span>
      <span className={`${valueClass} text-foreground`}>
        ${price}
        {showSuffix && (
          <span className="ml-1 text-xs md:text-sm font-normal text-muted-foreground">
            /night
          </span>
        )}
      </span>
    </div>
  );
};

export default PriceAnchor;

