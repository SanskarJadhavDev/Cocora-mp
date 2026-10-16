import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../services/api';
import { SiteFooter } from './Home';
import '../css/cart.css';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart, refreshCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('cart');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', city: '', pincode: ''
  });
  const [errors, setErrors]           = useState({});
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [placedOrder, setPlacedOrder]       = useState(null);
  const [myOrders, setMyOrders]             = useState([]);
  const [loadingOrders, setLoadingOrders]   = useState(false);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name:  prev.name  || user.name  || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const loadMyOrders = async () => {
    if (!isAuthenticated) return;
    setLoadingOrders(true);
    try {
      const response = await orderApi.getMyOrders();
      if (response?.data) setMyOrders(response.data);
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) loadMyOrders();
  }, [activeTab, isAuthenticated]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneClean = formData.phone.replace(/[\s-]/g, '');
    if (!formData.name.trim())    newErrors.name    = 'Full name is required';
    if (!formData.email.trim())   newErrors.email   = 'Email address is required';
    else if (!emailRegex.test(formData.email.trim())) newErrors.email = 'Please enter a valid email address';
    if (!formData.phone.trim())   newErrors.phone   = 'Phone number is required';
    else if (!/^\d{10}$/.test(phoneClean)) newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!formData.address.trim()) newErrors.address = 'Delivery address is required';
    if (!formData.city.trim())    newErrors.city    = 'City is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'PIN code is required';
    else if (!/^\d{6}$/.test(formData.pincode.trim())) newErrors.pincode = 'Please enter a valid 6-digit PIN code';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setCheckoutNotice('');
    if (!validate() || isSubmitting) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        customerDetails: {
          name:    formData.name.trim(),
          email:   formData.email.trim(),
          phone:   formData.phone.replace(/[\s-]/g, ''),
          address: formData.address.trim(),
          city:    formData.city.trim(),
          pincode: formData.pincode.trim(),
        },
        paymentMethod: 'COD',
      };
      const response = await orderApi.checkout(payload);
      if (response?.data) {
        setPlacedOrder(response.data);
        await refreshCart();
      }
    } catch (err) {
      setCheckoutNotice(err.message || 'Failed to place order. Please review your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemId    = (item) => item.productId || item.product?._id || item._id || item.id;
  const getItemName  = (item) => item.product?.name  || item.name  || 'Artisanal Chocolate';
  const getItemPrice = (item) => item.product?.price || item.price || item.unitPrice || 0;
  const getItemImage = (item) => item.product?.image || item.image || null;
  const getItemCategory = (item) => item.product?.category || item.category || '';

  const getStatusClass = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'delivered' || s === 'confirmed') return 'status-confirmed';
    if (s === 'cancelled') return 'status-cancelled';
    return 'status-pending';
  };

  const { items = [], subtotal = 0, deliveryFee = 0, totalAmount = 0, totalItems = 0 } = cart;

  return (
    <div className="cart-page">

      {/* ── HERO BAR ── */}
      <div className="cart-hero">
        <div className="cart-hero-inner">
          <p className="section-tag">Your Cart</p>
          <h1 className="section-title">Your Cocora Box</h1>
        </div>
      </div>

      {/* ── TABS ── */}
      {isAuthenticated && (
        <div className="cart-tabs" role="tablist" aria-label="Cart sections">
          <button
            id="tab-cart"
            type="button"
            role="tab"
            className={`cart-tab${activeTab === 'cart' ? ' active' : ''}`}
            onClick={() => setActiveTab('cart')}
            aria-selected={activeTab === 'cart'}
            aria-controls="cart-panel"
          >
            Current Cart ({totalItems})
          </button>
          <button
            id="tab-history"
            type="button"
            role="tab"
            className={`cart-tab${activeTab === 'history' ? ' active' : ''}`}
            onClick={() => setActiveTab('history')}
            aria-selected={activeTab === 'history'}
            aria-controls="history-panel"
          >
            My Orders
          </button>
        </div>
      )}

      {/* ── BODY ── */}
      <div className="cart-body">

        {/* ORDER PLACED CONFIRMATION */}
        {placedOrder ? (
          <div id="cart-panel">
            <div className="order-placed-card" role="alert">
              <div className="order-placed-icon" aria-hidden="true">🎉</div>
              <p className="section-tag">Order Confirmed</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-ivory-warm)' }}>
                Thank you, {placedOrder.customerDetails?.name || placedOrder.shippingAddress?.name || 'Valued Customer'}!
              </h2>
              <p style={{ color: 'var(--ivory-75)', fontSize: '0.95rem', textAlign: 'center' }}>
                Your order has been placed with Bandra West kitchen.
              </p>
              <div className="order-detail-table">
                <div className="order-detail-row">
                  <span>Order Reference</span>
                  <strong>{placedOrder.orderNumber}</strong>
                </div>
                <div className="order-detail-row">
                  <span>Total Amount</span>
                  <strong>₹{placedOrder.totalAmount}</strong>
                </div>
                <div className="order-detail-row">
                  <span>Payment</span>
                  <span>{placedOrder.paymentMethod || 'Cash on Delivery'}</span>
                </div>
                <div className="order-detail-row">
                  <span>Status</span>
                  <strong style={{ color: 'var(--color-gold-warm)' }}>{placedOrder.status || 'Pending'}</strong>
                </div>
                <div className="order-detail-row">
                  <span>Destination</span>
                  <span>
                    {placedOrder.customerDetails?.city || placedOrder.shippingAddress?.city},{' '}
                    {placedOrder.customerDetails?.pincode || placedOrder.shippingAddress?.pincode}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/collection" className="btn-primary" onClick={() => setPlacedOrder(null)}>
                  Explore More Chocolates
                </Link>
                {isAuthenticated && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => { setPlacedOrder(null); setActiveTab('history'); }}
                  >
                    View My Orders
                  </button>
                )}
              </div>
            </div>
          </div>

        ) : activeTab === 'history' ? (
          /* ORDER HISTORY */
          <div id="history-panel" role="tabpanel" aria-labelledby="tab-history">
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-ivory-warm)' }}>
                Your Past Orders
              </h2>
              <p style={{ color: 'var(--ivory-60)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Track your chocolate orders and delivery status.
              </p>
            </div>

            {loadingOrders ? (
              <div className="orders-list">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="order-hist-card">
                    <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 18, width: '60%', borderRadius: 6 }} />
                    <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 6 }} />
                  </div>
                ))}
              </div>
            ) : myOrders.length === 0 ? (
              <div className="cart-empty">
                <p style={{ color: 'var(--ivory-60)', fontSize: '0.95rem' }}>You haven't placed any orders yet.</p>
                <Link to="/collection" className="btn-primary">Browse Chocolates →</Link>
              </div>
            ) : (
              <div className="orders-list">
                {myOrders.map((ord) => (
                  <article key={ord._id} className="order-hist-card">
                    <div className="order-hist-header">
                      <div>
                        <p style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-gold-warm)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Order #{ord.orderNumber}
                        </p>
                        <p className="order-hist-date">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`order-status-badge ${getStatusClass(ord.status)}`}>
                        {ord.status}
                      </span>
                    </div>
                    <p className="order-hist-items">
                      {ord.items?.map((i) => `${i.name || i.productName || i.product?.name || 'Chocolate'} ×${i.quantity}`).join(', ')}
                    </p>
                    <div className="order-hist-footer">
                      <span className="order-hist-total">₹{ord.totalAmount}</span>
                      <span className="order-hist-date">
                        {ord.shippingAddress?.city || ord.customerDetails?.city}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

        ) : items.length === 0 ? (
          /* EMPTY CART */
          <div id="cart-panel" className="cart-empty" role="tabpanel" aria-labelledby="tab-cart">
            <div style={{ fontSize: '3.5rem', lineHeight: 1 }} aria-hidden="true">🍫</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-ivory-warm)' }}>
              Your Cocora box is empty.
            </p>
            <p style={{ color: 'var(--ivory-60)', fontSize: '0.9rem' }}>
              Browse our 60 artisanal chocolates and build something beautiful.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to="/collection" className="btn-primary">Explore Collection →</Link>
              <Link to="/build" className="btn-outline">Build a Box</Link>
            </div>
          </div>

        ) : (
          /* CART + CHECKOUT */
          <div id="cart-panel" role="tabpanel" aria-labelledby="tab-cart">
            <div className="cart-layout">

              {/* ── Left col: items + checkout form ── */}
              <div>
                {/* Items list */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory-warm)' }}>
                    Selected Items ({totalItems})
                  </h2>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={clearCart}
                    aria-label="Clear all items from cart"
                  >
                    Clear all
                  </button>
                </div>

                <div id="cart-items-list" className="cart-items-list">
                  {items.map((item, index) => {
                    const itemId  = getItemId(item);
                    const name    = getItemName(item);
                    const price   = getItemPrice(item);
                    const qty     = Number(item.quantity) || 1;
                    const img     = getItemImage(item);
                    const cat     = getItemCategory(item);

                    return (
                      <article key={`${itemId}-${index}`} className="cart-item-card">
                        {img && (
                          <div className="cart-item-img">
                            <img src={img} alt={name} loading="lazy" width="80" height="80" />
                          </div>
                        )}
                        <div className="cart-item-meta">
                          {cat && <p className="cart-item-category">{cat}</p>}
                          <h3 className="cart-item-name">{name}</h3>
                          <p className="cart-item-price">₹{price} each</p>
                          {item.chocolates?.length > 0 && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--ivory-60)', lineHeight: 1.4, marginTop: '0.25rem' }}>
                              Includes: {item.chocolates.join(', ')}
                            </p>
                          )}
                          <div className="cart-item-actions">
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => updateQuantity(itemId, qty - 1)}
                              aria-label={`Decrease quantity of ${name}`}
                            >
                              –
                            </button>
                            <span className="qty-display" aria-label={`Quantity: ${qty}`}>{qty}</span>
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => updateQuantity(itemId, qty + 1)}
                              aria-label={`Increase quantity of ${name}`}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => removeFromCart(itemId)}
                              aria-label={`Remove ${name} from cart`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p className="cart-item-price" style={{ fontSize: '1.1rem' }}>₹{price * qty}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Checkout form */}
                <div className="checkout-section" style={{ marginTop: '2rem' }}>
                  <div className="checkout-section-header">
                    <h2 className="checkout-section-title">Delivery & Contact Details</h2>
                    <p style={{ color: 'var(--ivory-60)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Provide your destination for temperature-controlled dispatch.
                    </p>
                  </div>

                  <div className="checkout-form-body">
                    {!isAuthenticated && (
                      <div className="auth-notice">
                        Have an account?{' '}
                        <Link to="/login" state={{ from: '/cart' }} style={{ color: 'var(--color-gold-warm)', fontWeight: 600 }}>
                          Sign in for faster checkout
                        </Link>
                      </div>
                    )}

                    {checkoutNotice && (
                      <div style={{ background: 'rgba(224, 108, 117, 0.1)', border: '1px solid rgba(224, 108, 117, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.875rem', color: 'var(--color-error)', fontSize: '0.875rem' }}>
                        {checkoutNotice}
                      </div>
                    )}

                    <form id="checkout-form" onSubmit={handleCheckoutSubmit} noValidate>
                      <div className="checkout-field" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="name" className="checkout-label">Full Name</label>
                        <input id="name" type="text" name="name" className={`checkout-input${errors.name ? ' checkout-input-error' : ''}`} placeholder="Aditya Sharma" value={formData.name} onChange={handleInputChange} />
                        {errors.name && <span className="field-error-text">{errors.name}</span>}
                      </div>

                      <div className="checkout-field-row" style={{ marginBottom: '1rem' }}>
                        <div className="checkout-field">
                          <label htmlFor="email" className="checkout-label">Email</label>
                          <input id="email" type="email" name="email" className={`checkout-input${errors.email ? ' checkout-input-error' : ''}`} placeholder="you@example.com" value={formData.email} onChange={handleInputChange} />
                          {errors.email && <span className="field-error-text">{errors.email}</span>}
                        </div>
                        <div className="checkout-field">
                          <label htmlFor="phone" className="checkout-label">Phone</label>
                          <input id="phone" type="tel" name="phone" className={`checkout-input${errors.phone ? ' checkout-input-error' : ''}`} placeholder="9876543210" value={formData.phone} onChange={handleInputChange} />
                          {errors.phone && <span className="field-error-text">{errors.phone}</span>}
                        </div>
                      </div>

                      <div className="checkout-field" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="address" className="checkout-label">Delivery Address</label>
                        <input id="address" type="text" name="address" className={`checkout-input${errors.address ? ' checkout-input-error' : ''}`} placeholder="Flat 402, Sea Green Apts, Perry Cross Rd" value={formData.address} onChange={handleInputChange} />
                        {errors.address && <span className="field-error-text">{errors.address}</span>}
                      </div>

                      <div className="checkout-field-row" style={{ marginBottom: '1.5rem' }}>
                        <div className="checkout-field">
                          <label htmlFor="city" className="checkout-label">City</label>
                          <input id="city" type="text" name="city" className={`checkout-input${errors.city ? ' checkout-input-error' : ''}`} placeholder="Mumbai" value={formData.city} onChange={handleInputChange} />
                          {errors.city && <span className="field-error-text">{errors.city}</span>}
                        </div>
                        <div className="checkout-field">
                          <label htmlFor="pincode" className="checkout-label">PIN Code</label>
                          <input id="pincode" type="text" name="pincode" className={`checkout-input${errors.pincode ? ' checkout-input-error' : ''}`} placeholder="400050" value={formData.pincode} onChange={handleInputChange} />
                          {errors.pincode && <span className="field-error-text">{errors.pincode}</span>}
                        </div>
                      </div>

                      {Object.keys(errors).length > 0 && (
                        <p id="checkout-error" role="alert" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginBottom: '1rem' }}>
                          Please correct the highlighted fields above.
                        </p>
                      )}

                      <button
                        id="checkout-submit"
                        type="submit"
                        className="btn-primary"
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                        disabled={isSubmitting}
                        aria-busy={isSubmitting}
                      >
                        {isSubmitting
                          ? 'Placing Order…'
                          : isAuthenticated
                          ? 'Place Order (Cash on Delivery)'
                          : 'Sign In to Complete Order'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* ── Right col: Order summary (sticky) ── */}
              <div className="order-summary" aria-label="Order summary">
                <div className="order-summary-header">
                  <h2 className="order-summary-title">Order Summary</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ivory-60)', marginTop: '0.25rem' }}>
                    {totalItems} {totalItems === 1 ? 'item' : 'items'} in your box
                  </p>
                </div>
                <div className="order-summary-body">
                  <div className="summary-row">
                    <span className="summary-row-label">Subtotal</span>
                    <span id="subtotal-display" className="summary-row-value">₹{subtotal}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-row-label">Delivery</span>
                    <span id="delivery-display" className="summary-row-value" style={deliveryFee === 0 ? { color: 'var(--color-success)', fontWeight: 600 } : {}}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="summary-divider" />
                  <div className="summary-total-row">
                    <span className="summary-total-label">Total</span>
                    <span id="total-display" className="summary-total-value">₹{totalAmount}</span>
                  </div>
                  <div className="cod-notice">
                    Cash on Delivery — pay at your door
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--ivory-60)', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--gold-10)', paddingTop: '0.75rem' }}>
                    <span>• Dispatched from Bandra West within 24 hours</span>
                    <span>• Temperature-controlled cold packaging included</span>
                    <span>• Free delivery on orders ₹1,000 and above</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
