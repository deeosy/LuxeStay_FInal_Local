import React from 'react';
import { ArrowDownRight } from 'lucide-react';

const CompareAlternatives = ({ cityName, targetId = 'similar-hotels' }) => {
  if (!cityName) return null;

  const handleClick = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mt-4 w-full flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/90 bg-secondary/60 hover:bg-secondary/80 border border-border rounded-lg px-4 py-2 transition-colors"
    >
      <ArrowDownRight className="w-4 h-4" />
      <span>Compare similar hotels in {cityName}</span>
    </button>
  );
};

export default CompareAlternatives;

