import React from 'react';

const ExitIntentModal = ({
  open,
  onViewDeal,
  onDismiss,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Offer reminder"
    >
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-luxury-md mx-4">
        <h2 className="text-lg font-semibold mb-2">
          Before you go
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          This deal may not be available later. Do you want to secure it now?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            Continue browsing
          </button>
          <button
            type="button"
            onClick={onViewDeal}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            View Deal
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitIntentModal;

