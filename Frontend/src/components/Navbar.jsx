import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const prevCount = useRef(cartCount);

  // Scroll → frosted glass
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Escape key closes mobile menu
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && mobileOpen) setMobileOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [mobileOpen]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Gold pulse when cart count changes
  useEffect(() => {
    if (prevCount.current !== cartCount && cartCount > prevCount.current) {
      setCartPulse(true);
      setTimeout(() => setCartPulse(false), 500);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { to: '/',            label: 'Home'         },
    { to: '/collection',  label: 'Collection'   },
    { to: '/build',       label: 'Build a Box'  },
    { to: '/gift-finder', label: 'Gift Finder'  },
  ];

  return (
    <>
      <header
        className={`navbar${scrolled ? ' scrolled' : ''}`}
        role="banner"
      >
        <div className="navbar-inner">
          <Link to="/" className="logo" aria-label="Cocora home">
            Cocora
          </Link>

          {/* Desktop nav */}
          <nav className="nav-links" aria-label="Primary navigation">
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`nav-link${isActive(to) ? ' active' : ''}`}
                aria-current={isActive(to) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={`nav-link${location.pathname.startsWith('/admin') ? ' active' : ''}`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Desktop actions */}
          <div className="navbar-actions">
            {isAuthenticated ? (
              <>
                <span className="nav-user-name">
                  {user?.name?.split(' ')[0] ?? 'Account'}
                </span>
                <button
                  type="button"
                  className="nav-logout-btn"
                  onClick={logout}
                  aria-label="Log out of Cocora"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className={`nav-link${isActive('/login') ? ' active' : ''}`}
              >
                Login
              </Link>
            )}

            <Link
              to="/cart"
              className={`box-counter${cartPulse ? ' cart-pulse' : ''}`}
              aria-label={`Cart, ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
            >
              <svg
                width="14" height="14"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {cartCount}
            </Link>

            {/* Hamburger */}
            <button
              type="button"
              className="nav-hamburger"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <span
                className="nav-hamburger-line"
                style={mobileOpen ? { transform: 'rotate(45deg) translate(5px, 5px)' } : {}}
              />
              <span
                className="nav-hamburger-line"
                style={mobileOpen ? { opacity: 0 } : {}}
              />
              <span
                className="nav-hamburger-line"
                style={mobileOpen ? { transform: 'rotate(-45deg) translate(5px, -5px)' } : {}}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <nav
        id="mobile-nav"
        className={`mobile-nav${mobileOpen ? ' open' : ''}`}
        aria-hidden={!mobileOpen}
        aria-label="Mobile navigation"
      >
        {navItems.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`mobile-nav-link${isActive(to) ? ' active' : ''}`}
          >
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link to="/admin" className={`mobile-nav-link${location.pathname.startsWith('/admin') ? ' active' : ''}`}>
            Admin
          </Link>
        )}

        <div className="mobile-nav-actions">
          {isAuthenticated ? (
            <>
              <span style={{ color: 'var(--color-gold-warm)', fontSize: '1rem' }}>
                {user?.name?.split(' ')[0]}
              </span>
              <button
                type="button"
                className="btn-outline"
                onClick={() => { logout(); setMobileOpen(false); }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary" onClick={() => setMobileOpen(false)}>
              Login / Register
            </Link>
          )}
          <Link to="/cart" className="btn-outline" onClick={() => setMobileOpen(false)}>
            Cart ({cartCount})
          </Link>
        </div>
      </nav>
    </>
  );
}
