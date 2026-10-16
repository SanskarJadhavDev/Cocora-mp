import React from 'react';

export default function KpiCard({
  title,
  value,
  formattedValue,
  caption,
  icon: Icon,
  hasAccent = false,
  className = ''
}) {
  return (
    <div
      className={`admin-kpi-card ${hasAccent ? 'admin-kpi-accent' : ''} ${className}`}
      style={{
        position: 'relative',
        backgroundColor: '#241333',
        borderRadius: '14px',
        padding: '20px 22px',
        border: hasAccent ? '1px solid rgba(229, 187, 50, 0.45)' : '1px solid rgba(229, 187, 50, 0.14)',
        background: hasAccent
          ? 'linear-gradient(180deg, rgba(229, 187, 50, 0.08) 0%, rgba(36, 19, 51, 1) 100%)'
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(36, 19, 51, 1) 100%)',
        boxShadow: hasAccent ? '0 4px 20px rgba(229, 187, 50, 0.08)' : '0 4px 16px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.2s ease, transform 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasAccent && (
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#E5BB32',
                display: 'inline-block',
                boxShadow: '0 0 8px rgba(229, 187, 50, 0.8)'
              }}
              title="Active pending dispatch"
            />
          )}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#B9A9C9'
            }}
          >
            {title}
          </span>
        </div>
        {Icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(229, 187, 50, 0.1)',
              border: '1px solid rgba(229, 187, 50, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E5BB32',
              flexShrink: 0
            }}
          >
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <p
          style={{
            fontFamily: "var(--font-display, 'Playfair Display', Georgia, serif)",
            fontSize: '32px',
            fontWeight: 600,
            lineHeight: 1.15,
            color: '#F7F0E5',
            margin: 0,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {formattedValue !== undefined ? formattedValue : value}
        </p>
      </div>

      {caption && (
        <p
          style={{
            fontSize: '12.5px',
            color: '#B9A9C9',
            margin: 0,
            lineHeight: 1.4,
            opacity: 0.85
          }}
        >
          {caption}
        </p>
      )}
    </div>
  );
}
