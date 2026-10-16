import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div
      className={`admin-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        color: '#B9A9C9'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: 'rgba(229, 187, 50, 0.08)',
          border: '1px solid rgba(229, 187, 50, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#E5BB32',
          marginBottom: '16px'
        }}
      >
        <Icon size={24} strokeWidth={1.75} />
      </div>
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#F7F0E5',
          margin: '0 0 6px 0'
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '13px',
          color: '#B9A9C9',
          maxWidth: '360px',
          margin: '0 0 16px 0',
          lineHeight: 1.5
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="admin-btn-secondary"
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '8px',
            border: '1px solid rgba(229, 187, 50, 0.3)',
            backgroundColor: 'rgba(229, 187, 50, 0.1)',
            color: '#E5BB32',
            cursor: 'pointer'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
