import React from 'react';

const STATUS_CONFIGS = {
  Pending: {
    label: 'Pending',
    dotColor: '#E5BB32',
    bg: 'rgba(229, 187, 50, 0.12)',
    text: '#E5BB32',
    border: 'rgba(229, 187, 50, 0.25)'
  },
  Confirmed: {
    label: 'Confirmed',
    dotColor: '#7FA8F0',
    bg: 'rgba(127, 168, 240, 0.12)',
    text: '#7FA8F0',
    border: 'rgba(127, 168, 240, 0.25)'
  },
  Processing: {
    label: 'Processing',
    dotColor: '#C084FC',
    bg: 'rgba(192, 132, 252, 0.12)',
    text: '#C084FC',
    border: 'rgba(192, 132, 252, 0.25)'
  },
  Shipped: {
    label: 'Shipped',
    dotColor: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)',
    text: '#38BDF8',
    border: 'rgba(56, 189, 248, 0.25)'
  },
  Delivered: {
    label: 'Delivered',
    dotColor: '#5BC48A',
    bg: 'rgba(91, 196, 138, 0.12)',
    text: '#5BC48A',
    border: 'rgba(91, 196, 138, 0.25)'
  },
  Cancelled: {
    label: 'Cancelled',
    dotColor: '#E5707E',
    bg: 'rgba(229, 112, 126, 0.12)',
    text: '#E5707E',
    border: 'rgba(229, 112, 126, 0.25)'
  }
};

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.Pending;

  return (
    <span
      className={`admin-status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: '0.02em',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.dotColor,
          flexShrink: 0
        }}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </span>
  );
}
