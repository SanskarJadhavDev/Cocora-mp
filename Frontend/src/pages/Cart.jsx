import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../css/cart.css'

export default function Cart({ cart, setCart }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  })
  const [errors, setErrors] = useState({})
  const [checkoutNotice, setCheckoutNotice] = useState('')

  const increaseQuantity = (index) => {
    const updated = [...cart]
    updated[index] = {
      ...updated[index],
      quantity: updated[index].quantity + 1
    }
    setCart(updated)
    localStorage.setItem('cocoraCart', JSON.stringify(updated))
  }

  const decreaseQuantity = (index) => {
    const updated = [...cart]
    if (updated[index].quantity > 1) {
      updated[index] = {
        ...updated[index],
        quantity: updated[index].quantity - 1
      }
    } else {
      updated.splice(index, 1)
    }
    setCart(updated)
    localStorage.setItem('cocoraCart', JSON.stringify(updated))
  }

  const removeItem = (index) => {
    const updated = cart.filter((_, i) => i !== index)
    setCart(updated)
    localStorage.setItem('cocoraCart', JSON.stringify(updated))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validate = () => {
    const newErrors = {}
    const emailRegex = /^\S+@\S+\.\S+$/
    const phoneClean = formData.phone.replace(/[\s-]/g, '')

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\d{10}$/.test(phoneClean)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Delivery address is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'PIN code is required'
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = 'Please enter a valid 6-digit PIN code'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setCheckoutNotice('')

    if (!validate()) {
      return
    }

    setCheckoutNotice('Checkout details validated. Ready for order API integration.')
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = cart.length === 0 ? 0 : subtotal >= 1000 ? 0 : 50
  const total = subtotal + delivery
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div>
      <main className="tray-sizes">
        <section>
          <p className="section-tag">YOUR CART</p>
          <h1 className="section-title">Your Cocora Box</h1>

          {cart.length === 0 ? (
            <div id="empty-cart-view" className="tray-card">
              <p className="build-text">Your Cocora box is empty.</p>
              <Link to="/collection" className="btn-primary">Explore Collection</Link>
            </div>
          ) : (
            <div id="cart-content-view" className="cart-layout">
              <div className="cart-main-col">
                <div className="tray-card">
                  <h2 className="tray-name">Selected Items</h2>
                  <p className="build-text">Chocolates tempered in Bandra West, packed for freshness.</p>
                  <div id="cart-items-list" className="cart-items-container">
                    {cart.map((item, index) => (
                      <div key={item.id + '-' + index} className="cart-item-card product-card">
                        <div className="cart-item-header">
                          <div>
                            <h3 className="cart-item-title product-name">{item.name}</h3>
                            {item.chocolates && item.chocolates.length > 0 && (
                              <p className="cart-item-chocolates product-desc">
                                Includes: {item.chocolates.join(', ')}
                              </p>
                            )}
                          </div>
                          <p className="cart-item-price product-price">₹{item.price}</p>
                        </div>
                        <div className="cart-item-footer">
                          <div className="cart-controls-row hero-buttons">
                            <button
                              type="button"
                              className="btn-outline qty-control-btn"
                              onClick={() => decreaseQuantity(index)}
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="btn-outline qty-badge">{item.quantity}</span>
                            <button
                              type="button"
                              className="btn-outline qty-control-btn"
                              onClick={() => increaseQuantity(index)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="btn-outline remove-item-btn"
                            onClick={() => removeItem(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tray-card">
                  <h2 className="tray-name">Checkout Details</h2>
                  <p className="build-text">Provide your delivery location for refrigerated delivery.</p>

                  {checkoutNotice && (
                    <div className="checkout-ready-notice">
                      {checkoutNotice}
                    </div>
                  )}

                  <form id="checkout-form" onSubmit={handleSubmit} noValidate>
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

                    <button type="submit" className="btn-primary checkout-submit-btn">
                      Place Order
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
                    <span id="delivery-display" className={delivery === 0 ? 'summary-badge-free' : ''}>
                      {delivery === 0 ? 'FREE' : `₹${delivery}`}
                    </span>
                  </div>

                  <div className="summary-divider"></div>

                  <div className="summary-total-row">
                    <span className="summary-total-label">Total Amount</span>
                    <span id="total-display" className="summary-total-amount">₹{total}</span>
                  </div>
                </div>

                <div className="summary-perks">
                  <p>• Dispatched from Bandra West within 24 hours</p>
                  <p>• Temperature-controlled cold packaging included</p>
                  <p>• Hand-written card with every order</p>
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
  )
}
