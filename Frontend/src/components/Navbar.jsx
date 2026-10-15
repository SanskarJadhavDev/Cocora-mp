import { Link, useLocation } from 'react-router-dom'

export default function Navbar({ cartCount }) {
  const location = useLocation()

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo">Cocora</Link>
        <nav className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/collection" className={`nav-link ${location.pathname === '/collection' ? 'active' : ''}`}>Collection</Link>
          <Link to="/build" className={`nav-link ${location.pathname === '/build' ? 'active' : ''}`}>Build a box</Link>
          <Link to="/gift-finder" className={`nav-link ${location.pathname === '/gift-finder' ? 'active' : ''}`}>Gift Finder</Link>
        </nav>
        <Link to="/cart" className="box-counter">Cart {cartCount}</Link>
      </div>
    </header>
  )
}
