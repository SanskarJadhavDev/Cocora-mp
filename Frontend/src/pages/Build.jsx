import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { productApi, boxApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import '../css/build.css';

const TRAY_OPTIONS = [
  { size: 6, label: 'Tray 6 — Half Tray', defaultPrice: 899 },
  { size: 12, label: 'Tray 12 — Signature', defaultPrice: 1699 },
  { size: 24, label: 'Tray 24 — Double', defaultPrice: 3199 }
];

const getChocoSlotStyle = (choco) => {
  const cat = (choco.category || '').toLowerCase();
  const type = (choco.chocolateType || '').toLowerCase();

  if (cat.includes('white') || type.includes('white')) {
    return { backgroundColor: '#E8D9C2', color: '#1A0F2E' };
  }
  if (cat.includes('fruit') || cat.includes('floral')) {
    return { backgroundColor: '#B06478', color: '#FFF' };
  }
  if (cat.includes('dark') || type.includes('dark')) {
    return { backgroundColor: '#3A1E14', color: '#FFF' };
  }
  if (cat.includes('milk') || type.includes('milk')) {
    return { backgroundColor: '#6B4226', color: '#FFF' };
  }
  if (cat.includes('sugar')) {
    return { backgroundColor: '#2E3D48', color: '#FFF' };
  }
  return { backgroundColor: '#7A4B29', color: '#FFF' };
};

export default function Build() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const initialTraySize = useMemo(() => {
    const param = searchParams.get('tray');
    const parsed = Number(param);
    if (parsed === 6 || parsed === 12 || parsed === 24) return parsed;
    return 12;
  }, [searchParams]);

  const [traySize, setTraySize] = useState(initialTraySize);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedChocolates, setSelectedChocolates] = useState([]);
  const [calculatedTotal, setCalculatedTotal] = useState(1699);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('');

  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (user) {
      setCustomerForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productApi.getProducts({ limit: 24, sort: 'featured' });
      if (response && response.data) {
        setAvailableProducts(response.data);

        const productParam = searchParams.get('product');
        if (productParam && productParam !== 'signature-box') {
          const preselected = response.data.find(
            (p) => p.slug === productParam || String(p._id) === productParam
          );
          if (preselected) {
            setSelectedChocolates([preselected]);
          }
        }
      }
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const validateServerBox = useCallback(async (currentChocos, size) => {
    if (currentChocos.length === 0) {
      const option = TRAY_OPTIONS.find((t) => t.size === size);
      setCalculatedTotal(option ? option.defaultPrice : 1699);
      return;
    }

    const counts = {};
    currentChocos.forEach((c) => {
      counts[c._id] = (counts[c._id] || 0) + 1;
    });

    const items = Object.entries(counts).map(([productId, quantity]) => ({
      productId,
      quantity
    }));

    if (currentChocos.length === size) {
      try {
        const response = await boxApi.validateBox({ traySize: size, items });
        if (response && response.data) {
          setCalculatedTotal(response.data.totalAmount || response.data.subtotal);
          setStatusMessage('Tray complete! Server-validated pricing applied.');
        }
      } catch (err) {
        setStatusMessage(err.message || 'Validation error');
      }
    } else {
      const sumPrices = currentChocos.reduce((acc, c) => acc + (Number(c.price) || 200), 0);
      setCalculatedTotal(sumPrices);
    }
  }, []);

  const selectTray = (size) => {
    setTraySize(size);
    setStatusMessage('');
    const trimmed = selectedChocolates.length > size ? selectedChocolates.slice(0, size) : selectedChocolates;
    setSelectedChocolates(trimmed);
    validateServerBox(trimmed, size);
  };

  const addChocolate = (choco) => {
    if (selectedChocolates.length >= traySize) {
      setStatusMessage(`Tray ${traySize} is full. Remove a piece to swap, or proceed to cart.`);
      return;
    }
    setStatusMessage('');
    const updated = [...selectedChocolates, choco];
    setSelectedChocolates(updated);
    validateServerBox(updated, traySize);
  };

  const removeChocolate = (index) => {
    const updated = selectedChocolates.filter((_, i) => i !== index);
    setSelectedChocolates(updated);
    setStatusMessage('');
    validateServerBox(updated, traySize);
  };

  const handleAddBoxToCart = async () => {
    if (selectedChocolates.length === 0) {
      setStatusMessage('Please select chocolates to fill your tray.');
      return;
    }
    if (selectedChocolates.length < traySize) {
      setStatusMessage(`Please fill all ${traySize} cavities (${selectedChocolates.length}/${traySize} filled).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const counts = {};
      selectedChocolates.forEach((c) => {
        counts[c._id] = (counts[c._id] || 0) + 1;
      });

      for (const [productId, quantity] of Object.entries(counts)) {
        await addToCart(productId, quantity);
      }

      setStatusMessage(`Custom Tray ${traySize} added to your cart successfully!`);
      setTimeout(() => {
        navigate('/cart');
      }, 1000);
    } catch (err) {
      setStatusMessage(err.message || 'Failed to add custom box to cart.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateCustomerForm = () => {
    const errs = {};
    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneClean = customerForm.phone.replace(/[\s-]/g, '');

    if (!customerForm.name.trim()) errs.name = 'Full name is required';
    if (!customerForm.email.trim()) errs.email = 'Email address is required';
    else if (!emailRegex.test(customerForm.email.trim())) errs.email = 'Enter a valid email';
    if (!customerForm.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(phoneClean)) errs.phone = 'Enter valid 10-digit phone';
    if (!customerForm.address.trim()) errs.address = 'Address is required';
    if (!customerForm.city.trim()) errs.city = 'City is required';
    if (!customerForm.pincode.trim()) errs.pincode = 'PIN code is required';
    else if (!/^\d{6}$/.test(customerForm.pincode.trim())) errs.pincode = 'Enter 6-digit PIN code';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDirectCheckout = async (e) => {
    e.preventDefault();
    if (!validateCustomerForm() || isSubmitting) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/build' } });
      return;
    }

    setIsSubmitting(true);
    try {
      const counts = {};
      selectedChocolates.forEach((c) => {
        counts[c._id] = (counts[c._id] || 0) + 1;
      });

      const items = Object.entries(counts).map(([productId, quantity]) => ({
        productId,
        quantity
      }));

      const payload = {
        traySize,
        items,
        customerDetails: {
          name: customerForm.name.trim(),
          email: customerForm.email.trim(),
          phone: customerForm.phone.replace(/[\s-]/g, ''),
          address: customerForm.address.trim(),
          city: customerForm.city.trim(),
          pincode: customerForm.pincode.trim()
        },
        paymentMethod: 'COD'
      };

      const response = await boxApi.checkoutBox(payload);
      if (response && response.data) {
        setOrderConfirmed(response.data);
        setShowCheckoutModal(false);
        setSelectedChocolates([]);
      }
    } catch (err) {
      setStatusMessage(err.message || 'Direct box checkout failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCatalog = availableProducts.filter((p) => {
    if (!activeCategoryFilter) return true;
    return p.category === activeCategoryFilter;
  });

  return (
    <div>
      <section className="build-section">
        <div className="build-inner">
          <div>
            <p className="section-tag">BUILD A CUSTOM BOX</p>
            <h2 className="build-title">You fill it. We handcraft the tray.</h2>
            <p className="build-text">
              Choose your tray capacity, tap any artisanal chocolate to fill the cavities, and order direct from our Bandra West kitchen.
            </p>

            <div style={{ marginBottom: '2.5rem' }}>
              <p className="section-tag">1. CHOOSE TRAY SIZE</p>
              <div className="hero-buttons">
                {TRAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.size}
                    type="button"
                    className={`btn-outline size-btn ${traySize === opt.size ? 'active' : ''}`}
                    onClick={() => selectTray(opt.size)}
                  >
                    Tray {opt.size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <p className="section-tag" style={{ margin: 0 }}>2. TAP CHOCOLATE TO ADD</p>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`category-tab ${activeCategoryFilter === '' ? 'active' : ''}`}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    onClick={() => setActiveCategoryFilter('')}
                  >
                    All
                  </button>
                  {['Dark Chocolate', 'Milk Chocolate', 'White Chocolate', 'Fruit & Floral'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-tab ${activeCategoryFilter === cat ? 'active' : ''}`}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                      onClick={() => setActiveCategoryFilter(cat)}
                    >
                      {cat.replace(' Chocolate', '')}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <p className="build-text">Loading fresh kitchen batches...</p>
              ) : (
                <div className="hero-buttons" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {filteredCatalog.map((choco) => (
                    <button
                      key={choco._id}
                      type="button"
                      className="btn-outline choco-btn"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      onClick={() => addChocolate(choco)}
                    >
                      {choco.name} (₹{choco.price}) +
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="tray-preview">
            <div className="tray-header">
              <span id="tray-name-display">TRAY {traySize} — {selectedChocolates.length === traySize ? 'FILLED' : 'CUSTOM'}</span>
              <span id="tray-count-display">{selectedChocolates.length} / {traySize} FILLED</span>
            </div>

            <div
              id="tray-grid"
              className="tray-grid"
              style={{
                gridTemplateColumns: traySize === 6 ? 'repeat(3, 1fr)' : traySize === 12 ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)'
              }}
            >
              {Array.from({ length: traySize }).map((_, i) => {
                if (i < selectedChocolates.length) {
                  const choco = selectedChocolates[i];
                  const style = getChocoSlotStyle(choco);
                  return (
                    <div
                      key={i}
                      className="tray-slot"
                      style={{
                        ...style,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        padding: '0.25rem',
                        overflow: 'hidden'
                      }}
                      title={`${choco.name} — Click to remove`}
                      onClick={() => removeChocolate(i)}
                    >
                      {choco.name.split(' ')[0]}
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    className="tray-slot slot-empty"
                    title="Empty Cavity"
                  ></div>
                );
              })}
            </div>

            <p id="selected-count-text" className="build-text" style={{ marginBottom: '0.5rem' }}>
              {selectedChocolates.length} / {traySize} chocolates selected
              {selectedChocolates.length > 0 && ' (click any piece to remove)'}
            </p>

            {statusMessage && (
              <p id="tray-status-message" className="section-tag" style={{ color: selectedChocolates.length === traySize ? '#50C878' : '#D4AF37' }}>
                {statusMessage}
              </p>
            )}

            <p id="box-price-display" className="tray-price">₹{calculatedTotal}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                id="add-box-btn"
                className="btn-primary"
                onClick={handleAddBoxToCart}
                disabled={isSubmitting || selectedChocolates.length === 0}
              >
                {isSubmitting ? 'Adding...' : 'Add Box to Cart'}
              </button>

              {selectedChocolates.length === traySize && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowCheckoutModal(true)}
                  disabled={isSubmitting}
                >
                  Direct Box Checkout &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {orderConfirmed && (
        <div className="tray-card" style={{ maxWidth: '40rem', margin: '3rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <p className="section-tag">CUSTOM BOX ORDER PLACED</p>
          <h2 className="tray-name" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
            Reference: {orderConfirmed.orderNumber}
          </h2>
          <p className="build-text">
            Your customized {orderConfirmed.customBoxDetails?.traySize || traySize}-piece box has been received by our tempering chefs.
          </p>
          <div style={{ background: '#1A0F2E', padding: '1.25rem', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Total Amount:</span>
              <strong style={{ color: '#D4AF37' }}>₹{orderConfirmed.totalAmount}</strong>
            </p>
            <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Status:</span>
              <span style={{ color: '#50C878', fontWeight: 600 }}>{orderConfirmed.status || 'Pending'}</span>
            </p>
            <p style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Destination:</span>
              <span>{orderConfirmed.shippingAddress?.city}, {orderConfirmed.shippingAddress?.pincode}</span>
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setOrderConfirmed(null)}
          >
            Build Another Tray
          </button>
        </div>
      )}

      {showCheckoutModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 5, 20, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div className="tray-card" style={{ maxWidth: '32rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="tray-name">Checkout Custom Tray {traySize}</h2>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                style={{ color: '#D4AF37', fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p className="build-text">Total Price: <strong style={{ color: '#D4AF37' }}>₹{calculatedTotal}</strong> (Cash on Delivery)</p>

            <form onSubmit={handleDirectCheckout} noValidate>
              <div className="checkout-fields-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="checkout-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="checkout-input"
                    value={customerForm.name}
                    onChange={handleFormChange}
                  />
                  {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
                </div>
                <div>
                  <label className="checkout-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="checkout-input"
                    value={customerForm.email}
                    onChange={handleFormChange}
                  />
                  {formErrors.email && <span className="field-error-text">{formErrors.email}</span>}
                </div>
                <div>
                  <label className="checkout-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    className="checkout-input"
                    value={customerForm.phone}
                    onChange={handleFormChange}
                  />
                  {formErrors.phone && <span className="field-error-text">{formErrors.phone}</span>}
                </div>
                <div>
                  <label className="checkout-label">Address</label>
                  <input
                    type="text"
                    name="address"
                    className="checkout-input"
                    value={customerForm.address}
                    onChange={handleFormChange}
                  />
                  {formErrors.address && <span className="field-error-text">{formErrors.address}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="checkout-label">City</label>
                    <input
                      type="text"
                      name="city"
                      className="checkout-input"
                      value={customerForm.city}
                      onChange={handleFormChange}
                    />
                    {formErrors.city && <span className="field-error-text">{formErrors.city}</span>}
                  </div>
                  <div>
                    <label className="checkout-label">PIN Code</label>
                    <input
                      type="text"
                      name="pincode"
                      className="checkout-input"
                      value={customerForm.pincode}
                      onChange={handleFormChange}
                    />
                    {formErrors.pincode && <span className="field-error-text">{formErrors.pincode}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Placing Order...' : 'Confirm Order (COD)'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowCheckoutModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
