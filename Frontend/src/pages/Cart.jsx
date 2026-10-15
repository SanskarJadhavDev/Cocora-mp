import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../services/api';
import '../css/cart.css';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('cart');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  });
  const [errors, setErrors] = useState({});
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const loadMyOrders = async () => {
    if (!isAuthenticated) return;
    setLoadingOrders(true);
    try {
      const response = await orderApi.getMyOrders();
      if (response && response.data) {
        setMyOrders(response.data);
      }
    } catch {
      return;
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) {
      loadMyOrders();
    }
  }, [activeTab, isAuthenticated]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneClean = formData.phone.replace(/[\s-]/g, '');

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phoneClean)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Delivery address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'PIN code is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Please enter a valid 6-digit PIN code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setCheckoutNotice('');

    if (!validate() || isSubmitting) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        shippingAddress: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.replace(/[\s-]/g, ''),
          address: formData.address.trim(),
          city: formData.city.trim(),
          pincode: formData.pincode.trim()
        },
        paymentMethod: 'COD'
      };

      const response = await orderApi.checkout(payload);
      if (response && response.data) {
        setPlacedOrder(response.data);
        await clearCart();
      }
    } catch (err) {
      setCheckoutNotice(err.message || 'Failed to place order. Please review your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemId = (item) => {
    return item.productId || (item.product && item.product._id) || item._id || item.id;
  };

  const getItemName = (item) => {
    return (item.product && item.product.name) || item.name || 'Artisanal Chocolate';
  };

  const getItemPrice = (item) => {
    return (item.product && item.product.price) || item.price || item.unitPrice || 0;
  };

  const { items, subtotal, deliveryFee, totalAmount, totalItems } = cart;

  return (
    <div>
      <main className="tray-sizes">
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <p className="section-tag">YOUR CART</p>
              <h1 className="section-title">Your Cocora Box</h1>
            </div>
            {isAuthenticated && (
              <div className="hero-buttons">
                <button
                  type="button"
                  className={`btn-outline ${activeTab === 'cart' ? 'tray-btn-primary' : ''}`}
                  onClick={() => setActiveTab('cart')}
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  Current Cart ({totalItems})
                </button>
                <button
                  type="button"
                  className={`btn-outline ${activeTab === 'history' ? 'tray-btn-primary' : ''}`}
                  onClick={() => setActiveTab('history')}
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  My Orders
                </button>
              </div>
            )}
          </div>

          {placedOrder ? (
            <div className="tray-card" style={{ maxWidth: '40rem', margin: '2rem auto', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <p className="section-tag">ORDER CONFIRMED</p>
              <h2 className="tray-name" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
                Thank you, {placedOrder.shippingAddress?.name || 'Valued Customer'}!
              </h2>
              <p className="build-text">
                Your order has been placed with Bandra West kitchen.
              </p>
              <div style={{ background: '#1A0F2E', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(212, 175, 55, 0.3)', margin: '1.5rem 0', textAlign: 'left' }}>
                <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'rgba(245, 237, 224, 0.7)' }}>Order Reference:</span>
                  <strong style={{ color: '#D4AF37' }}>{placedOrder.orderNumber}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'rgba(245, 237, 224, 0.7)' }}>Total Amount:</span>
                  <strong style={{ color: '#D4AF37' }}>₹{placedOrder.totalAmount}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'rgba(245, 237, 224, 0.7)' }}>Payment Method:</span>
                  <span>{placedOrder.paymentMethod || 'Cash on Delivery (COD)'}</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'rgba(245, 237, 224, 0.7)' }}>Delivery Status:</span>
                  <span style={{ color: '#D4AF37', fontWeight: 600 }}>{placedOrder.status || 'Pending'}</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(245, 237, 224, 0.7)' }}>Destination:</span>
                  <span>{placedOrder.shippingAddress?.city}, {placedOrder.shippingAddress?.pincode}</span>
                </p>
              </div>
              <div className="hero-buttons" style={{ justifyContent: 'center' }}>
                <Link to="/collection" className="btn-primary" onClick={() => setPlacedOrder(null)}>
                  Explore More Chocolates
                </Link>
                {isAuthenticated && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      setPlacedOrder(null);
                      setActiveTab('history');
                    }}
                  >
                    View My Orders
                  </button>
                )}
              </div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="tray-card">
              <h2 className="tray-name">Your Past Orders</h2>
              <p className="build-text">Track your chocolate orders and delivery status.</p>

              {loadingOrders ? (
                <p className="build-text">Loading your orders from Cocora...</p>
              ) : myOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p className="build-text">You haven't placed any orders yet.</p>
                  <Link to="/collection" className="btn-primary">Browse Chocolates</Link>
                </div>
              ) : (
                <div className="cart-items-container">
                  {myOrders.map((ord) => (
                    <div key={ord._id} className="cart-item-card">
                      <div className="cart-item-header">
                        <div>
                          <p className="product-code">Order #{ord.orderNumber}</p>
                          <h3 className="product-name">
                            {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </h3>
                          <p className="product-desc">
                            {ord.items && ord.items.map((i) => `${i.productName || 'Chocolate'} x${i.quantity}`).join(', ')}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p className="product-price">₹{ord.totalAmount}</p>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '9999px',
                              backgroundColor: ord.status === 'Delivered' ? 'rgba(80, 200, 120, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                              color: ord.status === 'Delivered' ? '#50C878' : '#D4AF37',
                              marginTop: '0.5rem'
                            }}
                          >
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : items.length === 0 ? (
            <div id="empty-cart-view" className="tray-card">
              <p className="build-text">Your Cocora box is empty.</p>
              <Link to="/collection" className="btn-primary">Explore Collection</Link>
            </div>
          ) : (
            <div id="cart-content-view" className="cart-layout">
              <div className="cart-main-col">
                <div className="tray-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 className="tray-name">Selected Items</h2>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                      onClick={clearCart}
                    >
                      Clear Box
                    </button>
                  </div>
                  <p className="build-text">Chocolates tempered in Bandra West, packed for freshness.</p>
                  <div id="cart-items-list" className="cart-items-container">
                    {items.map((item, index) => {
                      const itemId = getItemId(item);
                      const name = getItemName(item);
                      const price = getItemPrice(item);
                      const qty = Number(item.quantity) || 1;

                      return (
                        <div key={`${itemId}-${index}`} className="cart-item-card product-card">
                          <div className="cart-item-header">
                            <div>
                              <h3 className="cart-item-title product-name">{name}</h3>
                              {item.chocolates && item.chocolates.length > 0 && (
                                <p className="cart-item-chocolates product-desc">
                                  Includes: {item.chocolates.join(', ')}
                                </p>
                              )}
                            </div>
                            <p className="cart-item-price product-price">₹{price * qty}</p>
                          </div>
                          <div className="cart-item-footer">
                            <div className="cart-controls-row hero-buttons">
                              <button
                                type="button"
                                className="btn-outline qty-control-btn"
                                onClick={() => updateQuantity(itemId, qty - 1)}
                                aria-label="Decrease quantity"
                              >
                                -
                              </button>
                              <span className="btn-outline qty-badge">{qty}</span>
                              <button
                                type="button"
                                className="btn-outline qty-control-btn"
                                onClick={() => updateQuantity(itemId, qty + 1)}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="btn-outline remove-item-btn"
                              onClick={() => removeFromCart(itemId)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="tray-card">
                  <h2 className="tray-name">Delivery & Contact Details</h2>
                  <p className="build-text">Provide your destination for refrigerated temperature-controlled dispatch.</p>

                  {!isAuthenticated && (
                    <div className="checkout-ready-notice" style={{ background: 'rgba(212, 175, 55, 0.15)', borderColor: '#D4AF37', marginBottom: '1.5rem' }}>
                      <span>Already have an account? </span>
                      <Link to="/login" state={{ from: '/cart' }} style={{ color: '#D4AF37', fontWeight: 600, textDecoration: 'underline' }}>
                        Sign in for faster checkout
                      </Link>
                    </div>
                  )}

                  {checkoutNotice && (
                    <div className="checkout-ready-notice" style={{ marginBottom: '1.5rem', color: '#E06C75' }}>
                      {checkoutNotice}
                    </div>
                  )}

                  <form id="checkout-form" onSubmit={handleCheckoutSubmit} noValidate>
                    <div className="checkout-fields-grid">
                      <div className="checkout-field field-span-2">
                        <label htmlFor="name" className="checkout-label">Full Name</label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          className={`checkout-input ${errors.name ? 'checkout-input-error' : ''}`}
                          placeholder="Aditya Sharma"
                          value={formData.name}
                          onChange={handleInputChange}
                        />
                        {errors.name && <span className="field-error-text">{errors.name}</span>}
                      </div>

                      <div className="checkout-field">
                        <label htmlFor="email" className="checkout-label">Email Address</label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className={`checkout-input ${errors.email ? 'checkout-input-error' : ''}`}
                          placeholder="aditya@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                        {errors.email && <span className="field-error-text">{errors.email}</span>}
                      </div>

                      <div className="checkout-field">
                        <label htmlFor="phone" className="checkout-label">Phone Number</label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          className={`checkout-input ${errors.phone ? 'checkout-input-error' : ''}`}
                          placeholder="9876543210"
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                        {errors.phone && <span className="field-error-text">{errors.phone}</span>}
                      </div>

                      <div className="checkout-field field-span-2">
                        <label htmlFor="address" className="checkout-label">Delivery Address</label>
                        <input
                          type="text"
                          id="address"
                          name="address"
                          className={`checkout-input ${errors.address ? 'checkout-input-error' : ''}`}
                          placeholder="Flat 402, Sea Green Apts, Perry Cross Rd"
                          value={formData.address}
                          onChange={handleInputChange}
                        />
                        {errors.address && <span className="field-error-text">{errors.address}</span>}
                      </div>

                      <div className="checkout-field">
                        <label htmlFor="city" className="checkout-label">City</label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          className={`checkout-input ${errors.city ? 'checkout-input-error' : ''}`}
                          placeholder="Mumbai"
                          value={formData.city}
                          onChange={handleInputChange}
                        />
                        {errors.city && <span className="field-error-text">{errors.city}</span>}
                      </div>

                      <div className="checkout-field">
                        <label htmlFor="pincode" className="checkout-label">PIN Code</label>
                        <input
                          type="text"
                          id="pincode"
                          name="pincode"
                          className={`checkout-input ${errors.pincode ? 'checkout-input-error' : ''}`}
                          placeholder="400050"
                          value={formData.pincode}
                          onChange={handleInputChange}
                        />
                        {errors.pincode && <span className="field-error-text">{errors.pincode}</span>}
                      </div>
                    </div>

                    <p id="checkout-error" className="section-tag">
                      {Object.keys(errors).length > 0 && 'Please correct the highlighted fields above.'}
                    </p>

                    <button
                      type="submit"
                      className="btn-primary checkout-submit-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Placing Order...' : (isAuthenticated ? 'Place Order (Cash on Delivery)' : 'Sign In to Complete Order')}
                    </button>
                  </form>
                </div>
              </div>

              <div className="order-summary-card">
                <h2 className="tray-name">Order Summary</h2>
                <p className="order-summary-subtitle">{totalItems} {totalItems === 1 ? 'item' : 'items'} in your box</p>

                <div className="order-summary-rows">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span id="subtotal-display">₹{subtotal}</span>
                  </div>

                  <div className="summary-row">
                    <span>Delivery</span>
                    <span id="delivery-display" className={deliveryFee === 0 ? 'summary-badge-free' : ''}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>

                  <div className="summary-divider"></div>

                  <div className="summary-total-row">
                    <span className="summary-total-label">Total Amount</span>
                    <span id="total-display" className="summary-total-amount">₹{totalAmount}</span>
                  </div>
                </div>

                <div className="summary-perks">
                  <p>• Dispatched from Bandra West within 24 hours</p>
                  <p>• Temperature-controlled cold packaging included</p>
                  <p>• Free delivery on all orders ₹1,000 and above</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

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
