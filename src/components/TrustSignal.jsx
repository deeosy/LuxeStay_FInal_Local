import React, { useEffect, useState } from 'react';

const TrustSignal = ({ className = '' }) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const lang = (navigator.language || '').toLowerCase();

    if (lang.startsWith('fr')) {
      setMessage('Trusted by travelers from 🇫🇷 France');
      return;
    }

    if (lang.startsWith('en-gb')) {
      setMessage('Popular with guests from 🇬🇧 UK');
      return;
    }

    setMessage('Trusted by international travelers');
  }, []);

  if (!message) return null;

  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      {message}
    </p>
  );
};

export default TrustSignal;

