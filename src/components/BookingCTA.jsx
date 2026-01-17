import React from 'react';
import { ExternalLink } from 'lucide-react';

const BookingCTA = ({
  href,
  onClick,
  label = 'View Best Deal',
  className = '',
  size = 'md',
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors transition-transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

  const padding =
    size === 'lg'
      ? 'py-3 px-6 text-base'
      : size === 'sm'
      ? 'py-1.5 px-3 text-xs'
      : 'py-2 px-4 text-sm';

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        rel="nofollow sponsored"
        className={`w-full ${base} ${padding} ${className}`}
      >
        {label}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full ${base} ${padding} ${className}`}
    >
      {label}
      <ExternalLink className="w-3 h-3" />
    </button>
  );
};

export default BookingCTA;

