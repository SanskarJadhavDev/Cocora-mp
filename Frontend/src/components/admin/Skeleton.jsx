import React from 'react';

export function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', className = '', style = {} }) {
  return (
    <div
      className={`admin-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)',
        backgroundSize: '200% 100%',
        animation: 'admin-skeleton-pulse 1.8s ease-in-out infinite',
        ...style
      }}
      aria-hidden="true"
    />
  );
}

export function KpiSkeleton() {
  return (
    <div
      style={{
        backgroundColor: '#241333',
        borderRadius: '14px',
        padding: '20px 22px',
        border: '1px solid rgba(229, 187, 50, 0.14)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="90px" height="12px" />
        <Skeleton width="36px" height="36px" borderRadius="10px" />
      </div>
      <Skeleton width="120px" height="36px" borderRadius="6px" />
      <Skeleton width="140px" height="12px" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '16px 20px' }}>
          <Skeleton width={i === 0 ? '70%' : i === cols - 1 ? '50%' : '80%'} height="16px" />
        </td>
      ))}
    </tr>
  );
}
