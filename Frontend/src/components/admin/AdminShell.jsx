import React, { useState, useEffect } from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import Sidebar from './Sidebar';

function formatTimeAgo(date) {
  if (!date) return 'Not updated yet';
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffSec < 20) return 'Updated just now';
  if (diffSec < 60) return `Updated ${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return 'Updated 1 min ago';
  if (diffMin < 60) return `Updated ${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `Updated ${diffHours}h ago`;
}

export default function AdminShell({
  title,
  user,
  activeSection,
  onSelectSection,
  productsCount = 0,
  ordersCount = 0,
  onRefresh,
  isRefreshing = false,
  lastFetchedAt,
  onLogout,
  children
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [timeAgoText, setTimeAgoText] = useState(() => formatTimeAgo(lastFetchedAt));

  // Update "time ago" string periodically
  useEffect(() => {
    setTimeAgoText(formatTimeAgo(lastFetchedAt));
    const interval = setInterval(() => {
      setTimeAgoText(formatTimeAgo(lastFetchedAt));
    }, 15000);
    return () => clearInterval(interval);
  }, [lastFetchedAt]);

  const userName = user?.name || 'Cocora Admin';
  const userEmail = user?.email || 'admin@cocora.in';
  const userInitial = (userName.charAt(0) || 'A').toUpperCase();

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        productsCount={productsCount}
        ordersCount={ordersCount}
        onLogout={onLogout}
        mobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
      />

      {/* Main Content Area */}
      <div className="admin-main-wrapper">
        {/* Top bar with cohesive surface & bottom hairline */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            {/* Hamburger button for mobile/tablet (< 1024px) */}
            <button
              type="button"
              className="admin-hamburger-btn"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={20} strokeWidth={2} />
            </button>

            {/* Single H1 semantic heading */}
            <h1 className="admin-page-title">{title}</h1>
          </div>

          <div className="admin-topbar-right">
            {/* Refresh control with spin and timestamp */}
            <div className="admin-refresh-group">
              <span
                className="admin-last-updated"
                aria-live="polite"
                aria-atomic="true"
              >
                {timeAgoText}
              </span>
              <button
                type="button"
                className="admin-refresh-button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh dashboard data from database"
                aria-label="Refresh data"
              >
                <RefreshCw
                  size={15}
                  strokeWidth={2}
                  className={isRefreshing ? 'admin-spin' : ''}
                />
                <span className="admin-refresh-button-text">Refresh Data</span>
              </button>
            </div>

            {/* Compact user chip */}
            <div className="admin-user-chip" title={`Signed in as ${userName} (${userEmail})`}>
              <div className="admin-avatar">
                {userInitial}
              </div>
              <div className="admin-user-info">
                <span className="admin-user-name">{userName}</span>
                <span className="admin-user-email">{userEmail}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="admin-content" id="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
