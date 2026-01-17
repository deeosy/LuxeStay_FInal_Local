import React from 'react';

const messages = [
  'Limited availability for your dates',
  'High demand in this area',
  'Rooms selling fast this week',
];

const ScarcityBadge = ({ hotel, className = '' }) => {
  const price = hotel && hotel.price;
  if (!price) return null;

  const key =
    (hotel && (hotel.liteApiId || hotel.id || hotel.name)) || 'hotel';

  let hash = 0;
  for (let i = 0; i < String(key).length; i += 1) {
    hash = (hash + String(key).charCodeAt(i)) % 9973;
  }

  const message = messages[hash % messages.length];

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] font-medium ${className}`}
    >
      {message}
    </div>
  );
};

export default ScarcityBadge;

