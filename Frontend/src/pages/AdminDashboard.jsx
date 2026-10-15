import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/admin-dashboard.css'

const CATEGORIES = [
  'Milk Chocolate',
  'Dark Chocolate',
  'White Chocolate',
  'Zero Sugar',
  'Nuts & Praline',
  'Fruit & Floral',
  'Indian & Experimental'
]

const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: 'Obsidian',
    category: 'Dark Chocolate',
    price: 180,
    stock: 45,
    description: '72% dark, flaked sea salt, a long bitter finish.',
    imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&q=80',
    chocolateType: 'Dark',
    flavourTags: 'Sea salt, Bitter finish',
    occasions: 'Celebration, Birthday'
  },
  {
    id: 2,
    name: 'Ember',
    category: 'Dark Chocolate',
    price: 200,
    stock: 32,
    description: 'Dark ganache cut with Kashmiri chilli. Heat arrives late.',
    imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=150&q=80',
    chocolateType: 'Dark',
    flavourTags: 'Kashmiri chilli, Spiced',
    occasions: 'Birthday, Celebration'
  },
  {
    id: 3,
    name: 'Ivory Cardamom',
    category: 'White Chocolate',
    price: 190,
    stock: 28,
    description: 'White chocolate, green cardamom ground the same day.',
    imageUrl: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=150&q=80',
    chocolateType: 'White',
    flavourTags: 'Green cardamom, Aromatic',
    occasions: 'Anniversary, Wedding'
  },
  {
    id: 4,
    name: 'Malabar',
    category: 'Milk Chocolate',
    price: 210,
    stock: 40,
    description: 'Milk chocolate over cold-brewed Coorg coffee.',
    imageUrl: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=150&q=80',
    chocolateType: 'Milk',
    flavourTags: 'Coorg coffee, Roasted',
    occasions: 'Thank You, Colleague'
  },
  {
    id: 5,
    name: 'Hazelnut Praline',
    category: 'Nuts & Praline',
    price: 200,
    stock: 25,
    description: 'Roasted hazelnut ground to a paste, nothing else added.',
    imageUrl: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=150&q=80',
    chocolateType: 'Milk',
    flavourTags: 'Hazelnut paste, Nutty',
    occasions: 'Birthday, Just Because'
  },
  {
    id: 6,
    name: 'Kesar',
    category: 'Indian & Experimental',
    price: 250,
    stock: 18,
    description: 'Kashmiri saffron bloomed in cream. The expensive one.',
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=150&q=80',
    chocolateType: 'White',
    flavourTags: 'Kashmiri saffron, Floral',
    occasions: 'Anniversary, Celebration'
  }
]

const INITIAL_ORDERS = [
  {
    id: 'CCR-1041',
    customer: 'Aditya Sharma',
    date: '15 Oct 2026',
    items: 'Custom Box (Tray 12), Obsidian x2',
    total: 2059,
    status: 'Pending'
  },
  {
    id: 'CCR-1040',
    customer: 'Priya Mehta',
    date: '14 Oct 2026',
    items: 'Malabar x4, Kashmir Rose x2',
    total: 1280,
    status: 'Confirmed'
  },
  {
    id: 'CCR-1039',
    customer: 'Rohan Verma',
    date: '14 Oct 2026',
    items: 'Signature Box (Tray 12)',
    total: 1699,
    status: 'Shipped'
  },
  {
    id: 'CCR-1038',
    customer: 'Ananya Joshi',
    date: '13 Oct 2026',
    items: 'Ivory Cardamom x6',
    total: 1140,
    status: 'Delivered'
  },
  {
    id: 'CCR-1037',
    customer: 'Vikram Rao',
    date: '12 Oct 2026',
    items: 'Custom Box (Tray 6)',
    total: 999,
    status: 'Cancelled'
  }
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [products, setProducts] = useState(INITIAL_PRODUCTS)
  const [orders, setOrders] = useState(INITIAL_ORDERS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [feedbackNotice, setFeedbackNotice] = useState('')

  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    category: 'Dark Chocolate',
    price: '',
    imageUrl: '',
    stock: '',
    chocolateType: 'Dark',
    flavourTags: '',
    occasions: ''
  })

  const [formErrors, setFormErrors] = useState({})

  const handleLogout = () => {
    navigate('/login')
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setFormValues({
      name: '',
      description: '',
      category: 'Dark Chocolate',
      price: '',
      imageUrl: '',
      stock: '',
      chocolateType: 'Dark',
      flavourTags: '',
      occasions: ''
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setFormValues({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl,
      stock: product.stock,
      chocolateType: product.chocolateType || 'Dark',
      flavourTags: product.flavourTags || '',
      occasions: product.occasions || ''
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setFormErrors({})
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value
    }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateProductForm = () => {
    const errors = {}
    if (!formValues.name.trim()) {
      errors.name = 'Product name is required'
    }
    if (!formValues.category) {
      errors.category = 'Category is required'
    }
    const numPrice = Number(formValues.price)
    if (formValues.price === '' || isNaN(numPrice) || numPrice <= 0) {
      errors.price = 'Valid price greater than 0 is required'
    }
    const numStock = Number(formValues.stock)
    if (formValues.stock === '' || isNaN(numStock) || numStock < 0) {
      errors.stock = 'Valid stock (0 or more) is required'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSaveProduct = (e) => {
    e.preventDefault()
    if (!validateProductForm()) {
      return
    }

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === editingProduct.id
            ? {
                ...item,
                ...formValues,
                price: Number(formValues.price),
                stock: Number(formValues.stock)
              }
            : item
        )
      )
      setFeedbackNotice(`Product "${formValues.name}" updated (frontend state).`)
    } else {
      const newProduct = {
        id: Date.now(),
        ...formValues,
        price: Number(formValues.price),
        stock: Number(formValues.stock),
        imageUrl:
          formValues.imageUrl.trim() ||
          'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&q=80'
      }
      setProducts((prev) => [newProduct, ...prev])
      setFeedbackNotice(`Product "${formValues.name}" added (frontend state).`)
    }

    closeModal()
  }

  const handleDeleteProduct = (id, name) => {
    setProducts((prev) => prev.filter((item) => item.id !== id))
    setFeedbackNotice(`Product "${name}" deleted (frontend state).`)
  }

  const handleOrderStatusChange = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    )
    setFeedbackNotice(`Order ${orderId} status set to ${newStatus} (frontend state).`)
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'badge-pending'
      case 'Confirmed':
        return 'badge-confirmed'
      case 'Shipped':
        return 'badge-shipped'
      case 'Delivered':
        return 'badge-delivered'
      case 'Cancelled':
        return 'badge-cancelled'
      default:
        return 'badge-pending'
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'Pending').length

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <span>Cocora</span>
            <span className="admin-badge">ADMIN</span>
          </div>
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        </div>

        <nav className={`admin-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button
            type="button"
            className={`admin-nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('overview')
              setMobileMenuOpen(false)
            }}
          >
            <span>📊</span>
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeSection === 'products' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('products')
              setMobileMenuOpen(false)
            }}
          >
            <span>🍫</span>
            <span>Products</span>
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeSection === 'orders' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('orders')
              setMobileMenuOpen(false)
            }}
          >
            <span>📦</span>
            <span>Orders</span>
          </button>
        </nav>

        <div className={`admin-nav-footer ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">
              {activeSection === 'overview' && 'Dashboard Overview'}
              {activeSection === 'products' && 'Product Catalogue'}
              {activeSection === 'orders' && 'Order Management'}
            </h1>
            <p className="admin-topbar-subtitle">
              Manage handcrafted chocolates, inventory stock and customer orders
            </p>
          </div>
          <div className="admin-status-indicator">
            <span>●</span>
            <span>Preview Mode (Frontend Demo)</span>
          </div>
        </header>

        <div className="admin-content">
          {feedbackNotice && (
            <div className="admin-alert-banner">
              <span>{feedbackNotice}</span>
              <button
                type="button"
                className="admin-btn-sm"
                onClick={() => setFeedbackNotice('')}
              >
                ✕
              </button>
            </div>
          )}

          {activeSection === 'overview' && (
            <>
              <section className="overview-cards-grid">
                <div className="summary-card">
                  <p className="summary-card-tag">TOTAL PRODUCTS</p>
                  <p className="summary-card-value">{products.length}</p>
                  <p className="summary-card-desc">Sample active chocolates</p>
                </div>
                <div className="summary-card">
                  <p className="summary-card-tag">TOTAL ORDERS</p>
                  <p className="summary-card-value">{orders.length}</p>
                  <p className="summary-card-desc">Sample orders tracked</p>
                </div>
                <div className="summary-card">
                  <p className="summary-card-tag">PENDING ORDERS</p>
                  <p className="summary-card-value">{pendingCount}</p>
                  <p className="summary-card-desc">Awaiting fulfillment</p>
                </div>
                <div className="summary-card">
                  <p className="summary-card-tag">REVENUE</p>
                  <p className="summary-card-value">₹48,650</p>
                  <p className="summary-card-desc">Sample turnover to date</p>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-header">
                  <h2 className="admin-card-title">Recent Orders</h2>
                  <button
                    type="button"
                    className="btn-outline admin-btn-sm"
                    onClick={() => setActiveSection('orders')}
                  >
                    View All Orders &rarr;
                  </button>
                </div>

                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 4).map((order) => (
                        <tr key={order.id}>
                          <td><strong>{order.id}</strong></td>
                          <td>{order.customer}</td>
                          <td>{order.date}</td>
                          <td>₹{order.total}</td>
                          <td>
                            <span className={`table-badge ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activeSection === 'products' && (
            <section className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">Products ({products.length})</h2>
                  <p className="summary-card-desc">
                    Prepared for future catalogue with 7 distinct categories
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary admin-btn-sm"
                  onClick={openAddModal}
                >
                  + Add Product
                </button>
              </div>

              <div className="admin-table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="table-product-cell">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="table-product-img"
                              onError={(e) => {
                                e.target.src =
                                  'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&q=80'
                              }}
                            />
                            <div>
                              <strong>{item.name}</strong>
                              <p className="summary-card-desc">{item.chocolateType} Chocolate</p>
                            </div>
                          </div>
                        </td>
                        <td>{item.category}</td>
                        <td>₹{item.price}</td>
                        <td>{item.stock} pcs</td>
                        <td>
                          <div className="table-actions-cell">
                            <button
                              type="button"
                              className="admin-btn-sm admin-btn-edit"
                              onClick={() => openEditModal(item)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-btn-sm admin-btn-delete"
                              onClick={() => handleDeleteProduct(item.id, item.name)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === 'orders' && (
            <section className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">Customer Orders ({orders.length})</h2>
                  <p className="summary-card-desc">
                    Sample order status updates persist in frontend state
                  </p>
                </div>
              </div>

              <div className="admin-table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Change Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td><strong>{order.id}</strong></td>
                        <td>{order.customer}</td>
                        <td>{order.date}</td>
                        <td>{order.items}</td>
                        <td>₹{order.total}</td>
                        <td>
                          <span className={`table-badge ${getStatusBadgeClass(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <select
                            className="admin-select"
                            value={order.status}
                            onChange={(e) =>
                              handleOrderStatusChange(order.id, e.target.value)
                            }
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingProduct ? 'Edit Product' : 'Add New Chocolate Product'}
              </h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeModal}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} noValidate>
              <div className="admin-form-grid">
                <div className="admin-form-field admin-form-span-2">
                  <label className="admin-form-label">Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    className={`admin-form-input ${formErrors.name ? 'error' : ''}`}
                    placeholder="e.g. Ruby Cardamom"
                    value={formValues.name}
                    onChange={handleFormChange}
                  />
                  {formErrors.name && (
                    <span className="field-error-text">{formErrors.name}</span>
                  )}
                </div>

                <div className="admin-form-field admin-form-span-2">
                  <label className="admin-form-label">Description</label>
                  <textarea
                    name="description"
                    className="admin-form-textarea"
                    placeholder="Tasting notes and ingredients..."
                    value={formValues.description}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Category *</label>
                  <select
                    name="category"
                    className={`admin-form-select ${formErrors.category ? 'error' : ''}`}
                    value={formValues.category}
                    onChange={handleFormChange}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <span className="field-error-text">{formErrors.category}</span>
                  )}
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Chocolate Type</label>
                  <select
                    name="chocolateType"
                    className="admin-form-select"
                    value={formValues.chocolateType}
                    onChange={handleFormChange}
                  >
                    <option value="Dark">Dark</option>
                    <option value="Milk">Milk</option>
                    <option value="White">White</option>
                    <option value="Ruby">Ruby</option>
                    <option value="Zero Sugar">Zero Sugar</option>
                  </select>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Price (₹) *</label>
                  <input
                    type="number"
                    name="price"
                    className={`admin-form-input ${formErrors.price ? 'error' : ''}`}
                    placeholder="e.g. 210"
                    value={formValues.price}
                    onChange={handleFormChange}
                  />
                  {formErrors.price && (
                    <span className="field-error-text">{formErrors.price}</span>
                  )}
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Stock Quantity *</label>
                  <input
                    type="number"
                    name="stock"
                    className={`admin-form-input ${formErrors.stock ? 'error' : ''}`}
                    placeholder="e.g. 50"
                    value={formValues.stock}
                    onChange={handleFormChange}
                  />
                  {formErrors.stock && (
                    <span className="field-error-text">{formErrors.stock}</span>
                  )}
                </div>

                <div className="admin-form-field admin-form-span-2">
                  <label className="admin-form-label">Image URL</label>
                  <input
                    type="url"
                    name="imageUrl"
                    className="admin-form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={formValues.imageUrl}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Flavour Tags</label>
                  <input
                    type="text"
                    name="flavourTags"
                    className="admin-form-input"
                    placeholder="e.g. Cinnamon, Kashmiri Chilli"
                    value={formValues.flavourTags}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Suitable Occasions</label>
                  <input
                    type="text"
                    name="occasions"
                    className="admin-form-input"
                    placeholder="e.g. Anniversary, Birthday"
                    value={formValues.occasions}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-outline admin-btn-sm"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary admin-btn-sm">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
