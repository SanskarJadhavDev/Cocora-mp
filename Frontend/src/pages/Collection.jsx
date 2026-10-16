import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { SiteFooter } from './Home';
import '../css/collection.css';

const APPROVED_CATEGORIES = [
  'Milk Chocolate',
  'Dark Chocolate',
  'White Chocolate',
  'Zero Sugar',
  'Nuts & Praline',
  'Fruit & Floral',
  'Indian & Experimental'
];

function SkeletonCard() {
  return (
    <div className="product-card collection-loading-card">
      <div className="skeleton skeleton-img" style={{ height: 240 }} />
      <div className="skeleton-info">
        <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 20, width: '75%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 14, width: '90%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 6 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div className="skeleton" style={{ height: 22, width: 64, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 40, width: 40, borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  );
}

export default function Collection() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 9,
    totalProducts: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('featured');
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedNotice, setAddedNotice] = useState('');

  const fetchCategories = async () => {
    try {
      const response = await productApi.getCategories();
      if (response?.data) setCategoriesData(response.data);
    } catch {
      // ignore
    }
  };

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 9, sort: sortOption };
      if (selectedCategory) params.category = selectedCategory;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await productApi.getProducts(params);
      if (response?.data) {
        setProducts(response.data);
        if (response.pagination) setPagination(response.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to load chocolates.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, sortOption]);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  const handleCategoryChange = (cat) => setSelectedCategory(cat);
  const handleSearchSubmit = (e) => { e.preventDefault(); fetchProducts(1); };
  const handlePageChange = (newPage) => {
    fetchProducts(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = async (product) => {
    const res = await addToCart(product, 1);
    if (res?.success) {
      setAddedNotice(`"${product.name}" added to cart`);
      setTimeout(() => setAddedNotice(''), 2500);
    }
  };

  return (
    <div className="page-content">
      {/* ── HERO ── */}
      <section className="collection-hero" aria-label="Collection header">
        <div className="collection-hero-inner">
          <p className="section-tag collection-tag">The Collection</p>
          <h1 className="collection-title">
            Sixty artisanal chocolates,<br />tempered by season
          </h1>
          <p className="collection-intro">
            Handcrafted in Bandra West with single-origin Indian and global cocoa.
            Explore our full catalogue across seven distinct styles.
          </p>
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section className="collection-products" aria-label="Product catalogue">
        {/* Toolbar */}
        <div className="collection-toolbar" role="search">
          <form className="collection-search-row" onSubmit={handleSearchSubmit}>
            {/* Search */}
            <div className="search-icon-wrapper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="search"
                className="collection-search-input"
                placeholder="Search flavour, ingredient, name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search chocolates"
              />
            </div>

            {/* Sort */}
            <select
              className="collection-sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              aria-label="Sort products"
            >
              <option value="featured">Featured First</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="name">Name: A → Z</option>
              <option value="newest">Newest Additions</option>
            </select>
          </form>

          {/* Category tabs */}
          <div className="collection-categories" role="tablist" aria-label="Filter by category">
            <button
              type="button"
              role="tab"
              className={`category-tab${selectedCategory === '' ? ' active' : ''}`}
              onClick={() => handleCategoryChange('')}
              aria-selected={selectedCategory === ''}
            >
              All ({pagination.totalProducts || 60})
            </button>
            {APPROVED_CATEGORIES.map((cat) => {
              const catInfo = categoriesData.find((c) => c.category === cat);
              const countText = catInfo ? ` (${catInfo.count})` : '';
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  className={`category-tab${selectedCategory === cat ? ' active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                  aria-selected={selectedCategory === cat}
                >
                  {cat}{countText}
                </button>
              );
            })}
          </div>

          {/* Count */}
          {!loading && (
            <p className="collection-count">
              Showing <strong>{products.length}</strong> of{' '}
              <strong>{pagination.totalProducts}</strong> chocolates
              {selectedCategory && ` in ${selectedCategory}`}
            </p>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="collection-empty-box">
            <svg className="collection-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="section-title" style={{ fontSize: '1.5rem', color: 'var(--color-error)' }}>
              {error}
            </p>
            <button type="button" className="btn-primary" onClick={() => fetchProducts(pagination.currentPage)}>
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="collection-empty-box">
            <svg className="collection-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p className="section-title" style={{ fontSize: '1.5rem' }}>
              No chocolates matched
            </p>
            <p style={{ color: 'var(--ivory-60)', fontSize: '0.9rem', maxWidth: '28rem', textAlign: 'center' }}>
              Try clearing your search or selecting a different category.
            </p>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setSelectedCategory('');
                setSearchTerm('');
                setSortOption('featured');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <article key={product._id} className="product-card" tabIndex={0}>
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
                    <p className="product-category-sub">
                      {product.category}
                      {product.cocoaPercentage ? ` · ${product.cocoaPercentage}% Cocoa` : ''}
                    </p>
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
                        onClick={() => handleAddToCart(product)}
                        title={product.stock <= 0 ? 'Out of stock' : `Add ${product.name} to cart`}
                        aria-label={product.stock <= 0 ? `${product.name} — Out of stock` : `Add ${product.name} to cart`}
                        disabled={product.stock <= 0}
                      >
                        {product.stock <= 0 ? '×' : '+'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <nav className="collection-pagination" aria-label="Pagination">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  aria-label="Previous page"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      type="button"
                      className={`pagination-btn${pagination.currentPage === page ? ' active-page' : ''}`}
                      onClick={() => handlePageChange(page)}
                      aria-label={`Page ${page}`}
                      aria-current={pagination.currentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  aria-label="Next page"
                >
                  Next →
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {/* ── CTA ── */}
      <section className="collection-cta" aria-label="Build a box">
        <div className="collection-cta-inner">
          <p className="section-tag">Ready for something personal?</p>
          <h2 className="cta-title">Build your custom box</h2>
          <p className="cta-text">
            Choose between 6, 12, or 24 cavities and handpick your favourite flavours from our full catalogue.
          </p>
          <div className="hero-buttons" style={{ justifyContent: 'center' }}>
            <Link to="/build" className="btn-primary">Build your box →</Link>
            <Link to="/gift-finder" className="btn-outline">Gift Finder</Link>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Toast */}
      {addedNotice && (
        <div className="add-notice" role="status" aria-live="polite">
          ✓ {addedNotice}
        </div>
      )}
    </div>
  );
}
