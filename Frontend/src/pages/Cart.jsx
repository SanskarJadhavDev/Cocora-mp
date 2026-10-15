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
  const [checkoutError, setCheckoutError] = useState('')
  const [isOrderPlaced, setIsOrderPlaced] = useState(false)

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
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const { name, email, phone, address, city, pincode } = formData
    if (
      name.trim() === '' ||
      email.trim() === '' ||
      phone.trim() === '' ||
      address.trim() === '' ||
      city.trim() === '' ||
      pincode.trim() === ''
    ) {
      setCheckoutError('Please fill in all required fields.')
      return
    }

    setCheckoutError('')
    localStorage.removeItem('cocoraCart')
    setCart([])
    setIsOrderPlaced(true)
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = cart.length === 0 ? 0 : subtotal >= 1000 ? 0 : 50
  const total = subtotal + delivery

  return (
    <div>
      <main className="tray-sizes">
        <section>
          <p className="section-tag">YOUR CART</p>
          <h1 className="section-title">Your Cocora Box</h1>

          {isOrderPlaced ? (
            <div id="order-confirmation" className="tray-card">
              <h2 className="section-title">Order placed successfully!</h2>
              <p className="build-text">Thank you for choosing Cocora.</p>
              <Link to="/collection" className="btn-primary">Back to Collection</Link>
            </div>
          ) : cart.length === 0 ? (
            <div id="empty-cart-view" className="tray-card">
              <p className="build-text">Your Cocora box is empty.</p>
              <Link to="/collection" className="btn-primary">Explore Collection</Link>
            </div>
          ) : (
            <div id="cart-content-view">
              <div className="tray-card">
                <h2 className="tray-name">Selected Items</h2>
                <div id="cart-items-list">
                  {cart.map((item, index) => (
                    <div key={item.id + '-' + index} className="product-card">
                      <div className="product-info">
                        <h3 className="product-name">{item.name}</h3>
                        {item.chocolates && item.chocolates.length > 0 && (
                          <p className="product-desc">Includes: {item.chocolates.join(', ')}</p>
                        )}
                        <p className="product-price">₹{item.price}</p>
                        <div className="hero-buttons">
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => decreaseQuantity(index)}
                          >
                            -
                          </button>
                          <span className="btn-outline">{item.quantity}</span>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => increaseQuantity(index)}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => removeItem(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tray-card">
                <h2 className="tray-name">Order Summary</h2>
                <p className="build-text">Subtotal: <span id="subtotal-display">₹{subtotal}</span></p>
                <p className="build-text">Delivery: <span id="delivery-display">₹{delivery}</span></p>
                <p className="tray-price">Total: <span id="total-display">₹{total}</span></p>
              </div>

              <div className="tray-card">
                <h2 className="tray-name">Checkout Details</h2>
                <form id="checkout-form" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="name">Name</label><br />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="email">Email</label><br />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone">Phone</label><br />
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="address">Delivery Address</label><br />
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="city">City</label><br />
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="pincode">PIN Code</label><br />
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <p id="checkout-error" className="section-tag">{checkoutError}</p>
                    <button type="submit" className="btn-primary">Place Order</button>
                  </div>
                </form>
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
