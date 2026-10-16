import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { productApi, boxApi } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { SiteFooter } from './Home';
import '../css/build.css';

const TRAY_OPTIONS = [
  { size: 6,  label: 'Tray 6 — Half Tray', defaultPrice: 899,  subtitle: 'Half tray' },
  { size: 12, label: 'Tray 12 — Signature', defaultPrice: 1699, subtitle: 'Signature', popular: true },
  { size: 24, label: 'Tray 24 — Double',   defaultPrice: 3199, subtitle: 'Double layer' },
];

const getChocoSlotStyle = (choco) => {
  const cat  = (choco.category || '').toLowerCase();
  const type = (choco.chocolateType || '').toLowerCase();
  if (cat.includes('white') || type.includes('white'))
    return { bg: '#E8D9C2', color: '#1A0F2E', cls: 'slot-ivory' };
  if (cat.includes('fruit') || cat.includes('floral'))
    return { bg: '#B06478', color: '#FFF', cls: 'slot-rose' };
  if (cat.includes('dark') || type.includes('dark'))
    return { bg: '#3A1E14', color: '#E0A63C', cls: 'slot-malabar' };
  if (cat.includes('milk') || type.includes('milk'))
    return { bg: '#6B4226', color: '#FFF', cls: 'slot-obsidian' };
  if (cat.includes('sugar'))
    return { bg: '#2E3D48', color: '#86B39A', cls: 'slot-default' };
  if (cat.includes('nuts') || cat.includes('praline'))
    return { bg: '#A06A42', color: '#FFF', cls: 'slot-hazelnut' };
  if (cat.includes('indian'))
    return { bg: '#E0A63C', color: '#1A0F2E', cls: 'slot-alphonso' };
  return { bg: '#7A4B29', color: '#FFF', cls: 'slot-default' };
};

const CATEGORY_FILTERS = [
  { key: '', label: 'All' },
  { key: 'Dark Chocolate', label: 'Dark' },
  { key: 'Milk Chocolate', label: 'Milk' },
  { key: 'White Chocolate', label: 'White' },
  { key: 'Fruit & Floral', label: 'Fruit' },
  { key: 'Nuts & Praline', label: 'Nuts' },
  { key: 'Indian & Experimental', label: 'Indian' },
];

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
  const [statusType, setStatusType] = useState('info'); // 'info' | 'complete'
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [customerForm, setCustomerForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', pincode: ''
  });

  useEffect(() => {
    if (user) {
      setCustomerForm((prev) => ({
        ...prev,
        name:  prev.name  || user.name  || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productApi.getProducts({ limit: 60, sort: 'featured' });
      if (response?.data) {
        setAvailableProducts(response.data);
        const productParam = searchParams.get('product');
        if (productParam && productParam !== 'signature-box') {
          const preselected = response.data.find(
            (p) => p.slug === productParam || String(p._id) === productParam
          );
          if (preselected) setSelectedChocolates([preselected]);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const validateServerBox = useCallback(async (currentChocos, size) => {
    if (currentChocos.length === 0) {
      const option = TRAY_OPTIONS.find((t) => t.size === size);
      setCalculatedTotal(option ? option.defaultPrice : 1699);
      return;
    }
    const counts = {};
    currentChocos.forEach((c) => { counts[c._id] = (counts[c._id] || 0) + 1; });
    const items = Object.entries(counts).map(([productId, quantity]) => ({ productId, quantity }));

    if (currentChocos.length === size) {
      try {
        const response = await boxApi.validateBox({ traySize: size, items });
        if (response?.data) {
          setCalculatedTotal(response.data.totalAmount || response.data.subtotal);
          setStatusMessage('Tray complete! Price confirmed by our kitchen.');
          setStatusType('complete');
        }
      } catch (err) {
        setStatusMessage(err.message || 'Validation error');
        setStatusType('info');
      }
    } else {
      const sumPrices = currentChocos.reduce((acc, c) => acc + (Number(c.price) || 200), 0);
      setCalculatedTotal(sumPrices);
    }
  }, []);

  const selectTray = (size) => {
    setTraySize(size);
    setStatusMessage('');
    const trimmed = selectedChocolates.length > size
      ? selectedChocolates.slice(0, size) : selectedChocolates;
    setSelectedChocolates(trimmed);
    const option = TRAY_OPTIONS.find((t) => t.size === size);
    setCalculatedTotal(option ? option.defaultPrice : 1699);
    validateServerBox(trimmed, size);
  };

  const addChocolate = (choco) => {
    if (selectedChocolates.length >= traySize) {
      setStatusMessage(`Tray ${traySize} is full — remove a piece to swap.`);
      setStatusType('info');
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
    setStatusType('info');
    validateServerBox(updated, traySize);
  };

  const handleAddBoxToCart = async () => {
    if (selectedChocolates.length === 0) {
      setStatusMessage('Please select chocolates to fill your tray.');
      setStatusType('info');
      return;
    }
    if (selectedChocolates.length < traySize) {
      setStatusMessage(`Fill all ${traySize} cavities (${selectedChocolates.length}/${traySize} filled).`);
      setStatusType('info');
      return;
    }
    setIsSubmitting(true);
    try {
      const counts = {};
      selectedChocolates.forEach((c) => { counts[c._id] = (counts[c._id] || 0) + 1; });
      for (const [productId, quantity] of Object.entries(counts)) {
        await addToCart(productId, quantity);
      }
      setStatusMessage(`Custom Tray ${traySize} added to your cart!`);
      setStatusType('complete');
      setTimeout(() => navigate('/cart'), 1000);
    } catch (err) {
      setStatusMessage(err.message || 'Failed to add custom box to cart.');
      setStatusType('info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateCustomerForm = () => {
    const errs = {};
    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneClean = customerForm.phone.replace(/[\s-]/g, '');
    if (!customerForm.name.trim())  errs.name = 'Full name is required';
    if (!customerForm.email.trim()) errs.email = 'Email is required';
    else if (!emailRegex.test(customerForm.email.trim())) errs.email = 'Enter a valid email';
    if (!customerForm.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(phoneClean)) errs.phone = 'Enter 10-digit phone';
    if (!customerForm.address.trim()) errs.address = 'Address is required';
    if (!customerForm.city.trim())    errs.city = 'City is required';
    if (!customerForm.pincode.trim()) errs.pincode = 'PIN code is required';
    else if (!/^\d{6}$/.test(customerForm.pincode.trim())) errs.pincode = 'Enter 6-digit PIN';
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
      selectedChocolates.forEach((c) => { counts[c._id] = (counts[c._id] || 0) + 1; });
      const items = Object.entries(counts).map(([productId, quantity]) => ({ productId, quantity }));
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
      if (response?.data) {
        setOrderConfirmed(response.data);
        setShowCheckoutModal(false);
        setSelectedChocolates([]);
      }
    } catch (err) {
      setStatusMessage(err.message || 'Checkout failed.');
      setStatusType('info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCatalog = availableProducts.filter((p) =>
    !activeCategoryFilter || p.category === activeCategoryFilter
  );

  const fillPercent = traySize > 0 ? (selectedChocolates.length / traySize) * 100 : 0;
  const gridCols = traySize === 6 ? 'repeat(3, 1fr)'
                 : traySize === 12 ? 'repeat(4, 1fr)'
                 : 'repeat(6, 1fr)';

  return (
    <div className="build-page">

      {/* ── Order confirmed state ── */}
      {orderConfirmed ? (
        <main style={{ padding: 'calc(var(--nav-height) + 2rem) var(--container-px) 4rem', maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          <div className="order-confirmed-card">
            <div className="order-confirmed-icon" aria-hidden="true">🎉</div>
            <p className="section-tag">Custom Box Order Placed</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--color-ivory-warm)' }}>
              Reference: {orderConfirmed.orderNumber}
            </h1>
            <p className="build-text" style={{ textAlign: 'center' }}>
              Your customised {orderConfirmed.customBoxDetails?.traySize || traySize}-piece box has been received by our kitchen.
            </p>
            <div className="order-details-grid">
              <div className="order-details-row">
                <span>Total Amount</span>
                <strong>₹{orderConfirmed.totalAmount}</strong>
              </div>
              <div className="order-details-row">
                <span>Status</span>
                <strong style={{ color: 'var(--color-success)' }}>{orderConfirmed.status || 'Pending'}</strong>
              </div>
              <div className="order-details-row">
                <span>Destination</span>
                <span>{orderConfirmed.shippingAddress?.city}, {orderConfirmed.shippingAddress?.pincode}</span>
              </div>
            </div>
            <div className="hero-buttons" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn-primary" onClick={() => setOrderConfirmed(null)}>
                Build Another Tray
              </button>
              <Link to="/cart" className="btn-outline">View Orders →</Link>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* ── Hero strip ── */}
          <div className="build-hero">
            <div className="build-hero-inner">
              <p className="section-tag">Build a Custom Box</p>
              <h1 className="build-title">You fill it. We handcraft the tray.</h1>
              <p className="build-text" style={{ maxWidth: '42rem' }}>
                Choose your tray size, browse our catalogue of 60+ artisanal chocolates,
                and we'll package them beautifully from our Bandra West kitchen.
              </p>
            </div>
          </div>

          {/* ── Main builder ── */}
          <section className="build-section" aria-label="Box builder">
            <div className="build-inner">

              {/* Left column */}
              <div className="build-col-left">

                {/* Step 1 — Tray size */}
                <div>
                  <div className="build-step-label">
                    <span className="build-step-number" aria-hidden="true">1</span>
                    <span className="build-step-text">Choose tray size</span>
                  </div>
                  <div className="build-block">
                    <div className="tray-size-row">
                      {TRAY_OPTIONS.map((opt) => (
                        <button
                          key={opt.size}
                          type="button"
                          className={`size-option${traySize === opt.size ? ' active' : ''}`}
                          onClick={() => selectTray(opt.size)}
                          aria-pressed={traySize === opt.size}
                        >
                          {opt.popular && (
                            <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-gold-warm)', textTransform: 'uppercase' }}>
                              Popular
                            </span>
                          )}
                          <span className="size-option-number">{opt.size}</span>
                          <span className="size-option-label">pieces</span>
                          <span className="size-option-price">from ₹{opt.defaultPrice.toLocaleString('en-IN')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 2 — Catalogue */}
                <div>
                  <div className="build-step-label">
                    <span className="build-step-number" aria-hidden="true">2</span>
                    <span className="build-step-text">Select chocolates</span>
                  </div>
                  <div className="build-block">
                    {/* Category filter */}
                    <div className="catalog-filter-row" role="group" aria-label="Filter chocolate type">
                      {CATEGORY_FILTERS.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          className={`category-tab${activeCategoryFilter === key ? ' active' : ''}`}
                          onClick={() => setActiveCategoryFilter(key)}
                          style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {loading ? (
                      <p className="build-text">Loading fresh kitchen batches…</p>
                    ) : (
                      <div className="catalog-grid" role="list" aria-label="Available chocolates">
                        {filteredCatalog.map((choco) => (
                          <button
                            key={choco._id}
                            type="button"
                            className="choco-btn"
                            role="listitem"
                            onClick={() => addChocolate(choco)}
                            aria-label={`Add ${choco.name} (₹${choco.price})`}
                            title={`${choco.name} — ₹${choco.price}`}
                          >
                            <span className="choco-btn-name">{choco.name.split(' ').slice(0, 2).join(' ')}</span>
                            <span className="choco-btn-price">₹{choco.price}</span>
                          </button>
                        ))}
                        {filteredCatalog.length === 0 && (
                          <p className="build-text" style={{ gridColumn: '1/-1', textAlign: 'center' }}>
                            No chocolates in this category
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>{/* end left col */}

              {/* Right column — Tray Preview */}
              <div className="tray-preview" aria-live="polite" aria-label="Your tray">
                <div className="tray-header">
                  <span>Tray {traySize} — {selectedChocolates.length === traySize ? 'Complete' : 'Building…'}</span>
                  <span>{selectedChocolates.length} / {traySize}</span>
                </div>

                {/* Fill progress */}
                <div className="tray-fill-progress" aria-hidden="true">
                  <div className="tray-fill-bar" style={{ width: `${fillPercent}%` }} />
                </div>

                {/* Tray grid */}
                <div
                  id="tray-grid"
                  className="tray-grid"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  {Array.from({ length: traySize }).map((_, i) => {
                    if (i < selectedChocolates.length) {
                      const choco = selectedChocolates[i];
                      const style = getChocoSlotStyle(choco);
                      return (
                        <div
                          key={i}
                          className={`tray-slot ${style.cls}`}
                          style={{ backgroundColor: style.bg, color: style.color }}
                          title={`${choco.name} — click to remove`}
                          onClick={() => removeChocolate(i)}
                          role="button"
                          aria-label={`Remove ${choco.name}`}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && removeChocolate(i)}
                        >
                          {choco.name.split(' ')[0]}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={i}
                        className="tray-slot slot-empty"
                        aria-label="Empty cavity"
                        aria-hidden="true"
                      />
                    );
                  })}
                </div>

                {/* Count */}
                <p className="tray-count-label">
                  {selectedChocolates.length} / {traySize} filled
                  {selectedChocolates.length > 0 && ' — tap to remove'}
                </p>

                {/* Status message */}
                {statusMessage && (
                  <div className={`tray-status-msg${statusType === 'complete' ? ' complete' : ''}`}>
                    {statusMessage}
                  </div>
                )}

                {/* Price */}
                <p className="tray-price-display" aria-label={`Total: ₹${calculatedTotal}`}>
                  ₹{calculatedTotal.toLocaleString('en-IN')}
                </p>

                {/* Actions */}
                <div className="tray-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddBoxToCart}
                    disabled={isSubmitting || selectedChocolates.length === 0}
                    aria-busy={isSubmitting}
                  >
                    {isSubmitting ? 'Adding to cart…' : 'Add Box to Cart →'}
                  </button>

                  {selectedChocolates.length === traySize && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setShowCheckoutModal(true)}
                      disabled={isSubmitting}
                    >
                      Direct Box Checkout →
                    </button>
                  )}
                </div>
              </div>

            </div>
          </section>
        </>
      )}

      {/* ── Direct Checkout Modal ── */}
      {showCheckoutModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => e.target === e.currentTarget && setShowCheckoutModal(false)}
        >
          <div className="modal-card">
            <div className="modal-header">
              <h2 id="modal-title" className="modal-title">Checkout Tray {traySize}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowCheckoutModal(false)}
                aria-label="Close checkout modal"
              >
                ✕
              </button>
            </div>

            <p className="modal-price-line">
              Total: <strong>₹{calculatedTotal.toLocaleString('en-IN')}</strong> — Cash on Delivery
            </p>

            <form onSubmit={handleDirectCheckout} noValidate>
              <div className="modal-fields">
                <div className="modal-field">
                  <label className="checkout-label" htmlFor="m-name">Full Name</label>
                  <input id="m-name" type="text" name="name" className={`checkout-input${formErrors.name ? ' checkout-input-error' : ''}`} value={customerForm.name} onChange={handleFormChange} />
                  {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
                </div>
                <div className="modal-field-row">
                  <div className="modal-field">
                    <label className="checkout-label" htmlFor="m-email">Email</label>
                    <input id="m-email" type="email" name="email" className={`checkout-input${formErrors.email ? ' checkout-input-error' : ''}`} value={customerForm.email} onChange={handleFormChange} />
                    {formErrors.email && <span className="field-error-text">{formErrors.email}</span>}
                  </div>
                  <div className="modal-field">
                    <label className="checkout-label" htmlFor="m-phone">Phone</label>
                    <input id="m-phone" type="tel" name="phone" className={`checkout-input${formErrors.phone ? ' checkout-input-error' : ''}`} value={customerForm.phone} onChange={handleFormChange} />
                    {formErrors.phone && <span className="field-error-text">{formErrors.phone}</span>}
                  </div>
                </div>
                <div className="modal-field">
                  <label className="checkout-label" htmlFor="m-address">Address</label>
                  <input id="m-address" type="text" name="address" className={`checkout-input${formErrors.address ? ' checkout-input-error' : ''}`} value={customerForm.address} onChange={handleFormChange} />
                  {formErrors.address && <span className="field-error-text">{formErrors.address}</span>}
                </div>
                <div className="modal-field-row">
                  <div className="modal-field">
                    <label className="checkout-label" htmlFor="m-city">City</label>
                    <input id="m-city" type="text" name="city" className={`checkout-input${formErrors.city ? ' checkout-input-error' : ''}`} value={customerForm.city} onChange={handleFormChange} />
                    {formErrors.city && <span className="field-error-text">{formErrors.city}</span>}
                  </div>
                  <div className="modal-field">
                    <label className="checkout-label" htmlFor="m-pincode">PIN Code</label>
                    <input id="m-pincode" type="text" name="pincode" className={`checkout-input${formErrors.pincode ? ' checkout-input-error' : ''}`} value={customerForm.pincode} onChange={handleFormChange} />
                    {formErrors.pincode && <span className="field-error-text">{formErrors.pincode}</span>}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={isSubmitting} aria-busy={isSubmitting}>
                  {isSubmitting ? 'Placing order…' : 'Confirm Order (COD)'}
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowCheckoutModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
