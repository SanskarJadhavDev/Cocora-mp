import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo">Cocora</Link>
        <nav className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/collection" className={`nav-link ${location.pathname === '/collection' ? 'active' : ''}`}>Collection</Link>
          <Link to="/build" className={`nav-link ${location.pathname === '/build' ? 'active' : ''}`}>Build a box</Link>
          <Link to="/gift-finder" className={`nav-link ${location.pathname === '/gift-finder' ? 'active' : ''}`}>Gift Finder</Link>
          {isAdmin && (
            <Link to="/admin" className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>Admin</Link>
          )}
        </nav>
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <span className="nav-link" style={{ cursor: 'default', color: '#D4AF37' }}>
                {user ? user.name.split(' ')[0] : 'Account'}
              </span>
              <button
                type="button"
                onClick={logout}
                className="nav-link"
                style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, font: 'inherit' }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}>Login</Link>
          )}
          <Link to="/cart" className="box-counter">Cart {cartCount}</Link>
        </div>
      </div>
    </header>
  );
}
