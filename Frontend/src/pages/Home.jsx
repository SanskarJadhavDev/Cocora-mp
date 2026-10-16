import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../services/api';
import { useCart } from '../context/CartContext';
import '../css/home.css';

// GoldDust: lazy-loaded after first paint so headline/CTAs never block
const GoldDust = lazy(() => import('../components/effects/GoldDust'));

/* ══════════════════════════════════════════════════════
   SiteFooter — shared across all pages
   ════════════════════════════════════════════════════ */
export function SiteFooter() {
  return (
    <footer className="footer" role="contentinfo">
      {/* Footer CTA band */}
      <div className="footer-cta-band">
        <div className="footer-cta-inner">
          <p className="section-tag">Your perfect gift awaits</p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
            fontWeight: 600,
            color: 'var(--color-ivory-warm)',
            lineHeight: 1.15,
          }}>
            Make someone's day a little{' '}
            <em style={{ color: 'var(--color-gold-warm)' }}>sweeter.</em>
          </h2>
          <div className="hero-buttons" style={{ justifyContent: 'center' }}>
            <Link to="/gift-finder" className="hero-btn-primary">Try Gift Finder →</Link>
            <Link to="/build" className="hero-btn-ghost">Build a Box</Link>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <p className="footer-brand-name">Cocora</p>
            <p className="footer-brand-desc">
              A small chocolate kitchen in Bandra West, Mumbai. Single-origin
              cocoa, small batches, no shortcuts.
            </p>
            <p className="footer-tagline">"Good things are meant to be savoured."</p>
          </div>
          <div>
            <p className="footer-heading">Shop</p>
            <ul className="footer-links">
              <li><Link to="/collection">The Collection</Link></li>
              <li><Link to="/build">Build a Box</Link></li>
              <li><Link to="/gift-finder">Gift Finder</Link></li>
              <li><Link to="/cart">Your Cart</Link></li>
            </ul>
          </div>
          <div>
            <p className="footer-heading">Account</p>
            <ul className="footer-links">
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/login">Register</Link></li>
              <li><Link to="/cart">My Orders</Link></li>
            </ul>
          </div>
          <div>
            <p className="footer-heading">Kitchen</p>
            <ul className="footer-links">
              <li><span>Perry Cross Rd, Bandra West</span></li>
              <li><span>Mumbai 400 050</span></li>
              <li><span>Tue – Sun, 11am – 8pm</span></li>
              <li><a href="mailto:kitchen@cocora.in">kitchen@cocora.in</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Cocora Chocolate Co. — Mumbai</span>
          <span>Artisanal · Small-batch · Made with love</span>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════
   ProductCard — shared
   ════════════════════════════════════════════════════ */
export function ProductCard({ product, onAddToCart }) {
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (adding || product.stock <= 0) return;
    setAdding(true);
    await onAddToCart(product);
    setTimeout(() => setAdding(false), 700);
  };

  return (
    <article className="product-card" tabIndex={0}>
      <div className="product-image-container">
        <img
          src={product.image}
          alt={product.name}
          className="product-real-img"
          loading="lazy"
          width="600"
          height="400"
        />
        {product.isFeatured && (
          <span className="product-badge-featured">Featured</span>
        )}
      </div>
      <div className="product-info">
        <p className="product-code">{product.category}</p>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        {product.flavourNotes?.length > 0 && (
          <div className="product-flavour-tags">
            {product.flavourNotes.slice(0, 3).map((note) => (
              <span key={note} className="flavour-tag">{note}</span>
            ))}
          </div>
        )}
        <div className="product-footer">
          <span className="product-price">₹{product.price}</span>
          <button
            type="button"
            className="add-btn"
            onClick={handleAdd}
            aria-label={product.stock <= 0 ? `${product.name} — out of stock` : `Add ${product.name} to cart`}
            disabled={product.stock <= 0 || adding}
          >
            {product.stock <= 0 ? '×' : adding ? '✓' : '+'}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ══════════════════════════════════════════════════════
   Home page — main component
   ════════════════════════════════════════════════════ */
export default function Home() {
  const { addToCart, cartCount } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [addedNotice, setAddedNotice] = useState('');
  const [heroReady, setHeroReady] = useState(false);
  const [starsReady, setStarsReady] = useState(false);
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  // Pointer parallax
  const parallaxRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: null });
  const chocoRef    = useRef(null);
  const heroRef     = useRef(null);
  const prevCartCount = useRef(cartCount);

  // Fetch featured products
  useEffect(() => {
    const go = async () => {
      try {
        const res = await productApi.getFeatured();
        if (res?.data) setFeaturedProducts(res.data.slice(0, 3));
      } catch { /* optional section */ }
    };
    go();
  }, []);

  // Lazy-load GoldDust canvas after first paint
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setStarsReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Trigger entrance animations (add class to hero wrapper)
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setHeroReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Damped pointer parallax (disabled for touch/coarse & reduced motion)
  useEffect(() => {
    if (reducedMotion) return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (isCoarse) return;

    const p = parallaxRef.current;
    const hero = heroRef.current;
    if (!hero) return;

    const onMouseMove = (e) => {
      const rect = hero.getBoundingClientRect();
      p.x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2; // -1 → 1
      p.y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };

    const tick = () => {
      const lerp = 0.06;
      p.tx += (p.x - p.tx) * lerp;
      p.ty += (p.y - p.ty) * lerp;

      if (chocoRef.current) {
        chocoRef.current.style.transform =
          `translate(${p.tx * 14}px, ${p.ty * 10}px) scale(1.02)`;
      }

      p.raf = requestAnimationFrame(tick);
    };

    hero.addEventListener('mousemove', onMouseMove, { passive: true });
    p.raf = requestAnimationFrame(tick);

    return () => {
      hero.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(p.raf);
    };
  }, [reducedMotion]);

  // Cart count pulse
  useEffect(() => {
    if (prevCartCount.current !== cartCount) {
      prevCartCount.current = cartCount;
      // Trigger is handled by Navbar's own pulse class via state
    }
  }, [cartCount]);

  const handleAddToCart = async (product) => {
    const res = await addToCart(product, 1);
    if (res?.success) {
      setAddedNotice(`"${product.name}" added to cart`);
      setTimeout(() => setAddedNotice(''), 2500);
    }
  };

  return (
    <div>
      {/* ╔═══════════════════════════════════════╗
          ║   HERO — full-bleed cinematic scene    ║
          ╚═══════════════════════════════════════╝ */}
      <section
        id="hero-section"
        ref={heroRef}
        className={`hero${heroReady ? ' hero-enter-done' : ''}`}
        aria-label="Hero — Cocora artisan chocolates"
      >
        {/* Layer 1: midnight depth */}
        <div className="hero-bg" aria-hidden="true" />

        {/* Gold bloom behind chocolate */}
        <div className="hero-gold-bloom" aria-hidden="true" />

        {/* Layer 2: GoldDust canvas (lazy) */}
        <div className="hero-canvas" aria-hidden="true">
          {starsReady && !reducedMotion && (
            <Suspense fallback={null}>
              <GoldDust
                count={180}
                quality={window.innerWidth < 768 ? 0.45 : 0.9}
                backgroundColor="#160D22"
                colors={['#6E43A8', '#E5BB32']}
                direction="up"
                spread={90}
                focus={0.5}
                originOffset={0.25}
                originShift={0.35}
                speed={0.085}
                speedVariance={0.6}
                acceleration={0.6}
                trailLength={0.35}
                trailFade={1.8}
                lineWidth={1}
                starSize={2.0}
                twinkle={0.3}
                fadeOut={0.4}
                depth={0.7}
                glow={0.28}
                intensity={0.85}
                grain={0.15}
                interactive={true}
                thrust={0.6}
              />
            </Suspense>
          )}
        </div>

        {/* Layer 3: left vignette (contrast guard) */}
        <div className="hero-vignette-left" aria-hidden="true" />

        {/* Layer 4: Chocolate imagery with dissolve mask */}
        <div ref={chocoRef} className="hero-choco-wrap" aria-hidden="true">
          <img
            className="hero-choco-img"
            src="https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=1100&q=85"
            alt=""
            width="1100"
            height="1375"
            fetchPriority="high"
            decoding="async"
          />
          {/* Duotone tint overlay */}
          <div className="hero-choco-tint" aria-hidden="true" />
          {/* Gold rim highlight */}
          <div className="hero-choco-rim" aria-hidden="true" />
        </div>

        {/* Layer 5: Text/UI content */}
        <div className="hero-inner">
          <div className="hero-content">
            <p className="hero-tag" aria-label="Established 2026, Bandra West, Mumbai">
              Artisan Chocolates — Mumbai
            </p>

            <h1 className="hero-title">
              <span className="hero-title-line">Twelve cavities.</span>
              <span className="hero-title-line">
                <span className="hero-highlight">Yours to fill.</span>
              </span>
            </h1>

            <p className="hero-text">
              We temper in small batches and refuse to guess what you like.
              Pick the shell, pick the filling, pick who opens it.
            </p>

            <div className="hero-cta-row">
              <Link to="/build" className="hero-btn-primary">
                Build your box →
              </Link>
              <Link to="/collection" className="hero-btn-ghost">
                Explore the collection
              </Link>
            </div>

            <div className="hero-stats" aria-label="Key facts">
              <div className="stat-item">
                <span className="stat-value">60</span>
                <span className="stat-label">Flavours</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">Idukki</span>
                <span className="stat-label">Single origin</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">24 hrs</span>
                <span className="stat-label">Mumbai delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badge pill */}
        <div className="hero-badge" aria-hidden="true">
          <span className="hero-badge-dot" />
          <span className="hero-badge-text">Small Batch · Real Ingredients · 24h Delivery</span>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll-hint" aria-hidden="true">
          <div className="hero-scroll-line" />
          <span className="hero-scroll-label">Scroll</span>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║   TRUST STRIP marquee           ║
          ╚═════════════════════════════════╝ */}
      <div className="trust-strip" aria-label="Brand claims" role="marquee">
        <div className="trust-track" aria-live="off">
          {/* duplicated for seamless loop */}
          {[0, 1].map((set) => (
            <span key={set} style={{ display: 'contents' }}>
              {[
                '60 artisanal flavours',
                'Idukki single-origin cocoa',
                'Small-batch tempering',
                '24-hour Mumbai delivery',
                'Handcrafted in Bandra West',
                'Zero artificial flavours',
                'Temperature-controlled packaging',
              ].map((text, i) => (
                <span key={`${set}-${i}`} className="trust-item">
                  <span className="trust-item-dot" aria-hidden="true" />
                  {text}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ╔═════════════════════════════════╗
          ║   FEATURED COLLECTION           ║
          ╚═════════════════════════════════╝ */}
      {featuredProducts.length > 0 && (
        <section className="collection-preview" aria-labelledby="featured-heading">
          <div className="collection-preview-inner">
            <div className="section-header">
              <div className="section-header-left">
                <p className="section-tag">Kitchen Highlights</p>
                <h2 id="featured-heading" className="section-title">Seasonal Signatures</h2>
              </div>
              <Link to="/collection" className="view-all-link">
                View all 60 chocolates →
              </Link>
            </div>
            <div className="product-grid">
              {featuredProducts.map((p) => (
                <ProductCard key={p._id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ╔═════════════════════════════════╗
          ║   TRAY SIZES                    ║
          ╚═════════════════════════════════╝ */}
      <section id="trays" className="tray-sizes" aria-labelledby="tray-heading">
        <div className="tray-sizes-inner">
          <div className="tray-sizes-header">
            <p className="section-tag">Tray Sizes</p>
            <h2 id="tray-heading" className="section-title">
              Three trays. Same chocolate.
            </h2>
            <p style={{ color: 'var(--ivory-75)', marginTop: '0.75rem', fontSize: '1rem', lineHeight: 1.7 }}>
              Choose your capacity. Every piece is crafted fresh from our Bandra West kitchen.
            </p>
          </div>

          <div className="tray-sizes-grid">
            {/* Tray 6 */}
            <article className="tray-card-home">
              <div className="tray-number" aria-hidden="true">06</div>
              <h3 className="tray-name">Tray 6</h3>
              <p className="tray-subtitle">Half Tray</p>
              <p className="tray-price">₹899</p>
              <ul className="tray-features">
                <li>Six cavities, any combination</li>
                <li>Kraft sleeve, wax seal</li>
                <li>Handwritten note card</li>
              </ul>
              <Link to="/build?tray=6" className="tray-btn">Choose Tray 6 →</Link>
            </article>

            {/* Tray 12 */}
            <article className="tray-card-home tray-card-featured">
              <span className="tray-badge">Most Ordered</span>
              <div className="tray-number" aria-hidden="true">12</div>
              <h3 className="tray-name">Tray 12</h3>
              <p className="tray-subtitle">Signature</p>
              <p className="tray-price">₹1,699</p>
              <ul className="tray-features">
                <li>Twelve cavities, any combination</li>
                <li>Rigid box, magnetic close</li>
                <li>Letterpressed card, your message</li>
                <li>Cold pack April to June</li>
              </ul>
              <Link to="/build?tray=12" className="tray-btn tray-btn-primary">Choose Tray 12 →</Link>
            </article>

            {/* Tray 24 */}
            <article className="tray-card-home">
              <div className="tray-number" aria-hidden="true">24</div>
              <h3 className="tray-name">Tray 24</h3>
              <p className="tray-subtitle">Double</p>
              <p className="tray-price">₹3,199</p>
              <ul className="tray-features">
                <li>Twenty-four cavities, two layers</li>
                <li>Rigid box with ribbon pull</li>
                <li>Free delivery inside Mumbai</li>
              </ul>
              <Link to="/build?tray=24" className="tray-btn">Choose Tray 24 →</Link>
            </article>
          </div>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║   BRAND STORY                   ║
          ╚═════════════════════════════════╝ */}
      <section className="brand-story" aria-labelledby="brand-heading">
        <div className="brand-story-inner">
          <div className="brand-story-image">
            <img
              src="https://images.unsplash.com/photo-1607920592519-bab2a80efd77?w=800&q=80"
              alt="Cocoa beans and dark chocolate slabs on a marble surface"
              loading="lazy"
              width="800"
              height="960"
            />
            <blockquote className="brand-story-quote">
              "From the Western Ghats to your box."
            </blockquote>
          </div>

          <div className="brand-story-content">
            <div>
              <p className="section-tag">The Cocora Promise</p>
              <h2 id="brand-heading" className="section-title">
                Pure chocolate.<br />
                <em style={{ color: 'var(--color-gold-warm)' }}>Thoughtfully made.</em>
              </h2>
            </div>

            <div style={{ width: '3rem', height: '1px', background: 'linear-gradient(to right, var(--color-gold-warm), transparent)' }} aria-hidden="true" />

            <p style={{ color: 'var(--ivory-75)', lineHeight: 1.75 }}>
              We work with the finest beans, small-batch processes and a love for real chocolate.
              Our Bandra West kitchen is where single-origin Idukki cocoa becomes something truly memorable.
            </p>

            <p style={{ color: 'var(--ivory-75)', lineHeight: 1.75 }}>
              Every flavour in our collection is tested by season. No artificial flavours.
              No shortcuts. Just chocolate, craft, and care.
            </p>

            <div className="brand-story-pillars">
              <div className="brand-pillar">
                <svg className="brand-pillar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span className="brand-pillar-title">Real Ingredients</span>
                <span className="brand-pillar-desc">No artificial flavours</span>
              </div>
              <div className="brand-pillar">
                <svg className="brand-pillar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                </svg>
                <span className="brand-pillar-title">Single Origin</span>
                <span className="brand-pillar-desc">Idukki, Western Ghats</span>
              </div>
              <div className="brand-pillar">
                <svg className="brand-pillar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <span className="brand-pillar-title">Small Batches</span>
                <span className="brand-pillar-desc">Handcrafted in Mumbai</span>
              </div>
            </div>

            <Link to="/collection" className="hero-btn-ghost" style={{ alignSelf: 'flex-start' }}>
              Discover our collection →
            </Link>
          </div>
        </div>
      </section>

      {/* ╔═════════════════════════════════╗
          ║   SITE FOOTER                   ║
          ╚═════════════════════════════════╝ */}
      <SiteFooter />

      {/* Toast notification */}
      {addedNotice && (
        <div className="add-notice" role="status" aria-live="polite">
          ✓ {addedNotice}
        </div>
      )}
    </div>
  );
}
