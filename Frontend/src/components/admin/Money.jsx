import React from 'react';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

export function formatINR(amount) {
  const num = Number(amount) || 0;
  return inrFormatter.format(num);
}

export default function Money({ amount, className = '' }) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatINR(amount)}
    </span>
  );
}
