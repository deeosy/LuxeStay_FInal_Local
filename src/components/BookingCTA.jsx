import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';

const BookingCTA = ({ href, onClick, label = "Check Availability", size = "default", loading = false, className = "" }) => {
  const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
  
  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const sizeClasses = size === "lg" ? "h-12 px-8 text-lg" : "h-10 px-4 py-2";
  const variantClasses = "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200";

  const content = (
    <>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
      {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
    </>
  );

  if (href) {
    if (isExternal) {
      return (
        <a 
          href={href} 
          onClick={onClick}
          className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }
    return (
      <Link 
        to={href} 
        onClick={onClick}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
    >
      {content}
    </button>
  );
};

export default BookingCTA;
