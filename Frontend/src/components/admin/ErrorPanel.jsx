import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPanel({
  message = 'Failed to synchronize with MongoDB database.',
  onRetry,
  className = ''
}) {
  return (
    <div
      className={`admin-error-panel ${className}`}
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '12px',
        backgroundColor: 'rgba(229, 112, 126, 0.1)',
        border: '1px solid rgba(229, 112, 126, 0.3)',
        color: '#F7F0E5'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <AlertTriangle size={18} color="#E5707E" strokeWidth={2} />
        <span style={{ fontSize: '13.5px', color: '#F7F0E5', fontWeight: 500 }}>
          {message}
        </span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            fontSize: '12.5px',
            fontWeight: 500,
            borderRadius: '8px',
            border: '1px solid rgba(229, 112, 126, 0.4)',
            backgroundColor: 'rgba(229, 112, 126, 0.15)',
            color: '#F7F0E5',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} strokeWidth={2} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
