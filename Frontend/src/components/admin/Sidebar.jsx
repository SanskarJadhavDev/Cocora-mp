import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Store, LogOut, X } from 'lucide-react';

export default function Sidebar({
  activeSection,
  onSelectSection,
  productsCount = 0,
  ordersCount = 0,
  onLogout,
  mobileOpen = false,
  onCloseMobile
}) {
  const sidebarRef = useRef(null);

  // Close on Escape key press when mobile drawer is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    if (mobileOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, onCloseMobile]);

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      count: null
    },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      count: productsCount
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingBag,
      count: ordersCount
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`admin-sidebar ${mobileOpen ? 'admin-sidebar-mobile-open' : ''}`}
        aria-label="Admin Navigation"
      >
        {/* Brand header */}
        <div className="admin-sidebar-header">
          <div className="admin-brand-wrapper">
            <span className="admin-brand-name">Cocora</span>
            <span className="admin-brand-pill">ADMIN</span>
          </div>
          {mobileOpen && (
            <button
              type="button"
              className="admin-drawer-close"
              onClick={onCloseMobile}
              aria-label="Close navigation drawer"
            >
              <X size={20} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="admin-sidebar-nav">
          <div className="admin-nav-group-label">OPERATIONS</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectSection(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="admin-nav-indicator" aria-hidden="true" />
                <span className="admin-nav-icon">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span className="admin-nav-label">{item.label}</span>
                {item.count !== null && (
                  <span className={`admin-nav-count ${isActive ? 'active' : ''}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="admin-sidebar-footer">
          <Link
            to="/"
            className="admin-footer-link"
            title="Return to public chocolate boutique"
          >
            <span className="admin-footer-icon">
              <Store size={18} strokeWidth={1.8} />
            </span>
            <span>Back to Store</span>
          </Link>

          {onLogout && (
            <button
              type="button"
              className="admin-footer-btn-logout"
              onClick={onLogout}
              title="Sign out of administration console"
            >
              <span className="admin-footer-icon">
                <LogOut size={18} strokeWidth={1.8} />
              </span>
              <span>Log Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
