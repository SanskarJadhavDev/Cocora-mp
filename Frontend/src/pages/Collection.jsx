import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../services/api';
import { useCart } from '../context/CartContext';
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

export default function Collection() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 8,
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
      if (response && response.data) {
        setCategoriesData(response.data);
      }
    } catch {
      return;
    }
  };

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 8,
        sort: sortOption
      };
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await productApi.getProducts(params);
      if (response && response.data) {
        setProducts(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load chocolates.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, sortOption]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(1);
  };

  const handlePageChange = (newPage) => {
    fetchProducts(newPage);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleAddToCart = async (product) => {
    const res = await addToCart(product, 1);
    if (res && res.success) {
      setAddedNotice(`Added "${product.name}" to your cart!`);
      setTimeout(() => {
        setAddedNotice('');
      }, 2500);
    }
  };

  return (
    <div>
      <section className="collection-hero">
        <div className="collection-hero-inner">
          <p className="section-tag collection-tag">THE COLLECTION</p>
          <h1 className="collection-title">Sixty artisanal chocolates, tempered by season</h1>
          <p className="collection-intro">
            Handcrafted in Bandra West with single-origin Indian and global cocoa. Explore our full catalogue across seven distinct styles.
          </p>
        </div>
      </section>

      <section className="collection-products">
        <div className="collection-toolbar">
          <form className="collection-search-row" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="collection-search-input"
              placeholder="Search by flavour, ingredient, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="collection-sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="featured">Featured First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
              <option value="newest">Newest Additions</option>
            </select>
          </form>

          <div className="collection-categories">
            <button
              type="button"
              className={`category-tab ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => handleCategoryChange('')}
            >
              All Chocolates ({pagination.totalProducts || 60})
            </button>
            {APPROVED_CATEGORIES.map((cat) => {
              const catInfo = categoriesData.find((c) => c.category === cat);
              const countText = catInfo ? ` (${catInfo.count})` : '';
              return (
                <button
                  key={cat}
                  type="button"
                  className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat}{countText}
                </button>
              );
            })}
          </div>
        </div>

        {addedNotice && (
          <div
            className="auth-notice"
            style={{ marginBottom: '2rem', textAlign: 'center' }}
          >
            {addedNotice}
          </div>
        )}

        {loading ? (
          <div className="collection-empty-box">
            <p className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              Loading Cocora chocolates...
            </p>
            <p className="collection-intro" style={{ margin: '0 auto' }}>
              Fetching latest batch profiles from the kitchen database.
            </p>
          </div>
        ) : error ? (
          <div className="collection-empty-box">
            <p className="section-title" style={{ fontSize: '1.5rem', color: '#E06C75', marginBottom: '1rem' }}>
              {error}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => fetchProducts(pagination.currentPage)}
            >
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="collection-empty-box">
            <p className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
              No chocolates matched your criteria
            </p>
            <p className="collection-intro" style={{ margin: '0 auto 1.5rem auto' }}>
              Try clearing your search query or selecting a different category.
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
                <article key={product._id} className="product-card">
                  <div className="product-image-container">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-real-img"
                      loading="lazy"
                    />
                    {product.isFeatured && (
                      <span className="product-badge-featured">FEATURED</span>
                    )}
                  </div>
                  <div className="product-info">
                    <p className="product-category-sub">
                      {product.category} {product.cocoaPercentage ? `· ${product.cocoaPercentage}% Cocoa` : ''}
                    </p>
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-desc">{product.description}</p>
                    {product.flavourNotes && product.flavourNotes.length > 0 && (
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
                        title="Add to cart"
                        disabled={product.stock <= 0}
                      >
                        {product.stock <= 0 ? '✕' : '+'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="collection-pagination">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                >
                  &larr; Previous
                </button>
                <span className="pagination-info">
                  Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalProducts} chocolates)
                </span>
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="collection-cta">
        <div className="collection-cta-inner">
          <h2 className="cta-title">Ready to build your custom box?</h2>
          <p className="cta-text">Choose between 6, 12, or 24 cavities and select your favourite flavours.</p>
          <Link to="/build" className="btn-primary">Build your box</Link>
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
                <li><Link to="/#trays">Tray sizes</Link></li>
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
  );
}
