import { Link } from 'react-router-dom'
import '../css/home.css'

export default function Home() {
  return (
    <div>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <p className="hero-tag">EST. 2026 — BANDRA WEST</p>
            <h1 className="hero-title">
              Twelve cavities.<br />
              <span className="hero-highlight">Yours to fill.</span>
            </h1>
            <p className="hero-text">
              We temper in small batches and refuse to guess what you like. Pick the
              shell, pick the filling, pick who opens it.
            </p>
            <div className="hero-buttons">
              <Link to="/build" className="btn-primary">Build your box</Link>
              <Link to="/collection" className="btn-outline">See the collection</Link>
            </div>
            <div className="hero-stats">
              <div>
                <p className="stat-value">12</p>
                <p className="stat-label">Flavours</p>
              </div>
              <div>
                <p className="stat-value">Idukki</p>
                <p className="stat-label">Single origin</p>
              </div>
              <div>
                <p className="stat-value">24 hrs</p>
                <p className="stat-label">Mumbai delivery</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="trays" className="tray-sizes">
        <p className="section-tag">TRAY SIZES</p>
        <h2 className="section-title tray-sizes-title">Three trays. Same chocolate.</h2>

        <div className="tray-sizes-grid">
          <div className="tray-card">
            <h3 className="tray-name">Tray 6</h3>
            <p className="tray-subtitle">Half tray</p>
            <p className="tray-price">₹899</p>
            <ul className="tray-features">
              <li>Six cavities, any combination</li>
              <li>Kraft sleeve, wax seal</li>
              <li>Handwritten note card</li>
            </ul>
            <Link to="/collection" className="tray-btn">Choose tray 6</Link>
          </div>

          <div className="tray-card tray-card-featured">
            <span className="tray-badge">MOST ORDERED</span>
            <h3 className="tray-name">Tray 12</h3>
            <p className="tray-subtitle">Signature</p>
            <p className="tray-price">₹1,699</p>
            <ul className="tray-features">
              <li>Twelve cavities, any combination</li>
              <li>Rigid box, magnetic close</li>
              <li>Letterpressed card, your message</li>
              <li>Cold pack April to June</li>
            </ul>
            <Link to="/collection" className="tray-btn tray-btn-primary">Choose tray 12</Link>
          </div>

          <div className="tray-card">
            <h3 className="tray-name">Tray 24</h3>
            <p className="tray-subtitle">Double</p>
            <p className="tray-price">₹3,199</p>
            <ul className="tray-features">
              <li>Twenty-four cavities, two layers</li>
              <li>Rigid box with ribbon pull</li>
              <li>Free delivery inside Mumbai</li>
            </ul>
            <Link to="/collection" className="tray-btn">Choose tray 24</Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <p className="footer-brand-name">Cocora</p>
              <p className="footer-brand-desc">
                A small chocolate kitchen in Bandra West. We make twelve things and we
                make them well.
              </p>
            </div>
            <div>
              <p className="footer-heading">Shop</p>
              <ul className="footer-links">
                <li><Link to="/collection">The collection</Link></li>
                <li><Link to="/build">Build a box</Link></li>
                <li><a href="#trays">Tray sizes</a></li>
              </ul>
            </div>
            <div>
              <p className="footer-heading">Kitchen</p>
              <ul className="footer-links">
                <li>Perry Cross Rd, Bandra West</li>
                <li>Tue to Sun, 11am to 8pm</li>
                <li>kitchen@cocora.in</li>
              </ul>
            </div>
          </div>
          <p className="footer-bottom">
            © 2026 Cocora Chocolate Co. — Mumbai
          </p>
        </div>
      </footer>
    </div>
  )
}
