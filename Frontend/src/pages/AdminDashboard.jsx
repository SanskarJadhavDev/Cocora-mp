import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productApi, orderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../css/admin-dashboard.css';

const CATEGORIES = [
  'Milk Chocolate',
  'Dark Chocolate',
  'White Chocolate',
  'Zero Sugar',
  'Nuts & Praline',
  'Fruit & Floral',
  'Indian & Experimental'
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, loading: authLoading, logout } = useAuth();

  const [activeSection, setActiveSection] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  });

  const [formErrors, setFormErrors] = useState({});

  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingData(true);
    try {
      const [prodRes, ordRes] = await Promise.allSettled([
        productApi.getProducts({ limit: 24, sort: 'newest' }),
        orderApi.getAllOrders()
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value && prodRes.value.data) {
        setProducts(prodRes.value.data);
      }
      if (ordRes.status === 'fulfilled' && ordRes.value && ordRes.value.data) {
        setOrders(ordRes.value.data);
      }
    } catch {
      return;
    } finally {
      setLoadingData(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        navigate('/login', { state: { from: '/admin' } });
      } else if (isAdmin) {
        fetchAdminData();
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate, fetchAdminData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openAddModal = () => {
    setEditingProduct(null);
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
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormValues({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      imageUrl: product.image || '',
      stock: product.stock,
      chocolateType: product.chocolateType || 'Dark',
      flavourTags: Array.isArray(product.flavourNotes) ? product.flavourNotes.join(', ') : '',
      occasions: Array.isArray(product.suitableOccasions) ? product.suitableOccasions.join(', ') : ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
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

  const validateProductForm = () => {
    const errors = {};
    if (!formValues.name.trim()) errors.name = 'Product name is required';
    if (!formValues.description.trim()) errors.description = 'Product description is required';
    if (!formValues.category) errors.category = 'Category is required';

    const numPrice = Number(formValues.price);
    if (formValues.price === '' || isNaN(numPrice) || numPrice <= 0) {
      errors.price = 'Valid price greater than 0 is required';
    }

    const numStock = Number(formValues.stock);
    if (formValues.stock === '' || isNaN(numStock) || numStock < 0) {
      errors.stock = 'Valid stock (0 or more) is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!validateProductForm() || isSubmitting) return;

    setIsSubmitting(true);
    setFeedbackNotice('');

    try {
      const payload = {
        name: formValues.name.trim(),
        description: formValues.description.trim(),
        category: formValues.category,
        price: Number(formValues.price),
        stock: Number(formValues.stock),
        image: formValues.imageUrl.trim() || 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&q=80',
        chocolateType: formValues.chocolateType || 'Dark',
        flavourNotes: formValues.flavourTags.split(',').map((s) => s.trim()).filter(Boolean),
        suitableOccasions: formValues.occasions.split(',').map((s) => s.trim()).filter(Boolean)
      };

      if (editingProduct) {
        const res = await productApi.updateProduct(editingProduct._id, payload);
        if (res && res.data) {
          setFeedbackNotice(`Product "${res.data.name}" updated successfully.`);
          await fetchAdminData();
        }
      } else {
        const res = await productApi.createProduct(payload);
        if (res && res.data) {
          setFeedbackNotice(`Product "${res.data.name}" added to MongoDB catalogue.`);
          await fetchAdminData();
        }
      }
      closeModal();
    } catch (err) {
      setFeedbackNotice(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the catalogue?`)) {
      return;
    }

    try {
      await productApi.deleteProduct(id);
      setFeedbackNotice(`Product "${name}" deleted from database.`);
      await fetchAdminData();
    } catch (err) {
      setFeedbackNotice(err.message || 'Failed to delete product.');
    }
  };

  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      await orderApi.updateOrderStatus(orderId, newStatus);
      setFeedbackNotice(`Order status successfully updated to "${newStatus}".`);
      await fetchAdminData();
    } catch (err) {
      setFeedbackNotice(err.message || 'Failed to update order status.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'badge-pending';
      case 'Confirmed':
      case 'Processing':
        return 'badge-confirmed';
      case 'Shipped':
        return 'badge-shipped';
      case 'Delivered':
        return 'badge-delivered';
      case 'Cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-pending';
    }
  };

  if (authLoading) {
    return (
      <div className="admin-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p className="build-text">Verifying administrative access...</p>
      </div>
    );
  }

  if (isAuthenticated && !isAdmin) {
    return (
      <div className="admin-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="tray-card" style={{ maxWidth: '30rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <p className="section-tag" style={{ color: '#E06C75' }}>ACCESS DENIED</p>
          <h2 className="tray-name" style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>
            Administrator Privileges Required
          </h2>
          <p className="build-text">
            Your account ({user?.email}) has customer access. You do not have permission to view or manage the Cocora administrative console.
          </p>
          <div className="hero-buttons" style={{ justifyContent: 'center' }}>
            <Link to="/" className="btn-primary">Return to Store</Link>
            <button type="button" className="btn-outline" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === 'Pending').length;
  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

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
              setActiveSection('overview');
              setMobileMenuOpen(false);
            }}
          >
            <span>📊</span>
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeSection === 'products' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('products');
              setMobileMenuOpen(false);
            }}
          >
            <span>🍫</span>
            <span>Products ({products.length})</span>
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeSection === 'orders' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('orders');
              setMobileMenuOpen(false);
            }}
          >
            <span>📦</span>
            <span>Orders ({orders.length})</span>
          </button>
          <Link
            to="/"
            className="admin-nav-item"
            style={{ marginTop: 'auto' }}
          >
            <span>🏪</span>
            <span>Visit Storefront</span>
          </Link>
        </nav>

        <div className="admin-nav-footer">
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <h1 className="topbar-heading">
              {activeSection === 'overview' && 'Kitchen Operations & Metrics'}
              {activeSection === 'products' && 'Product Catalogue Management'}
              {activeSection === 'orders' && 'Order Fulfillment & History'}
            </h1>
            <p className="topbar-sub">Logged in as {user?.name || 'Administrator'} ({user?.email})</p>
          </div>
          <button type="button" className="admin-refresh-btn" onClick={fetchAdminData}>
            ↻ Refresh Data
          </button>
        </header>

        {feedbackNotice && (
          <div className="admin-notice" style={{ margin: '1.5rem 2rem 0' }}>
            <span>{feedbackNotice}</span>
            <button
              type="button"
              className="admin-notice-close"
              onClick={() => setFeedbackNotice('')}
            >
              ✕
            </button>
          </div>
        )}

        {loadingData && (
          <p className="build-text" style={{ padding: '1rem 2rem' }}>
            Synchronizing with MongoDB Atlas...
          </p>
        )}

        <div className="admin-content">
          {activeSection === 'overview' && (
            <div className="overview-section">
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">TOTAL REVENUE</span>
                    <span className="metric-icon">💰</span>
                  </div>
                  <p className="metric-value">₹{totalRevenue.toLocaleString('en-IN')}</p>
                  <p className="metric-sub">From {orders.length} placed orders</p>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">TOTAL ORDERS</span>
                    <span className="metric-icon">📦</span>
                  </div>
                  <p className="metric-value">{orders.length}</p>
                  <p className="metric-sub">{pendingCount} pending fulfillment</p>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">PRODUCTS IN CATALOGUE</span>
                    <span className="metric-icon">🍫</span>
                  </div>
                  <p className="metric-value">{products.length}</p>
                  <p className="metric-sub">Across 7 approved categories</p>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">PENDING DISPATCH</span>
                    <span className="metric-icon">⏳</span>
                  </div>
                  <p className="metric-value">{pendingCount}</p>
                  <p className="metric-sub">Requires chef review</p>
                </div>
              </div>

              <div className="overview-tables-split">
                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">Recent Orders</h2>
                    <button
                      type="button"
                      className="admin-link-btn"
                      onClick={() => setActiveSection('orders')}
                    >
                      View all &rarr;
                    </button>
                  </div>
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order Ref</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order._id}>
                            <td><strong>{order.orderNumber}</strong></td>
                            <td>{order.shippingAddress?.name || order.customBoxDetails?.customerDetails?.name || 'Customer'}</td>
                            <td>₹{order.totalAmount}</td>
                            <td>
                              <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {orders.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                              No orders placed yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    <h2 className="admin-card-title">Catalogue Quick Preview</h2>
                    <button
                      type="button"
                      className="admin-link-btn"
                      onClick={() => setActiveSection('products')}
                    >
                      Manage &rarr;
                    </button>
                  </div>
                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Chocolate</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.slice(0, 5).map((p) => (
                          <tr key={p._id}>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.category}</td>
                            <td>₹{p.price}</td>
                            <td>{p.stock} pcs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'products' && (
            <div className="products-section">
              <div className="section-actions-bar">
                <button type="button" className="btn-primary" onClick={openAddModal}>
                  + Add New Chocolate
                </button>
              </div>

              <div className="admin-card">
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product Details</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p._id}>
                          <td>
                            <img
                              src={p.image}
                              alt={p.name}
                              style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '0.35rem' }}
                            />
                          </td>
                          <td>
                            <strong>{p.name}</strong>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(245, 237, 224, 0.6)', marginTop: '0.2rem' }}>
                              {p.description.slice(0, 60)}...
                            </p>
                          </td>
                          <td>{p.category}</td>
                          <td>₹{p.price}</td>
                          <td>
                            <span style={{ color: p.stock < 10 ? '#E06C75' : '#50C878', fontWeight: 600 }}>
                              {p.stock}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="action-btn edit-btn"
                                onClick={() => openEditModal(p)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="action-btn delete-btn"
                                onClick={() => handleDeleteProduct(p._id, p.name)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                            No products found in catalogue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'orders' && (
            <div className="orders-section">
              <div className="admin-card">
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order Number</th>
                        <th>Customer</th>
                        <th>Items Summary</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Change Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((ord) => (
                        <tr key={ord._id}>
                          <td>
                            <strong>{ord.orderNumber}</strong>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(245, 237, 224, 0.6)' }}>
                              {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </td>
                          <td>
                            <p>{ord.shippingAddress?.name || ord.customBoxDetails?.customerDetails?.name || 'Customer'}</p>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(245, 237, 224, 0.6)' }}>
                              {ord.shippingAddress?.city || ord.customBoxDetails?.customerDetails?.city}
                            </p>
                          </td>
                          <td>
                            <p style={{ fontSize: '0.85rem' }}>
                              {ord.orderType === 'custom_box'
                                ? `Custom Box (Tray ${ord.customBoxDetails?.traySize || 12})`
                                : ord.items?.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                            </p>
                          </td>
                          <td><strong>₹{ord.totalAmount}</strong></td>
                          <td>
                            <span className={`status-badge ${getStatusBadgeClass(ord.status)}`}>
                              {ord.status}
                            </span>
                          </td>
                          <td>
                            <select
                              className="status-select"
                              value={ord.status}
                              onChange={(e) => handleOrderStatusChange(ord._id, e.target.value)}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                            No orders found in database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingProduct ? 'Edit Chocolate' : 'Add New Chocolate to Catalogue'}
              </h2>
              <button type="button" className="modal-close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} noValidate>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    className={`form-input ${formErrors.name ? 'form-input-error' : ''}`}
                    placeholder="e.g. Malabar Coffee Dark"
                    value={formValues.name}
                    onChange={handleFormChange}
                  />
                  {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    name="description"
                    className={`form-textarea ${formErrors.description ? 'form-input-error' : ''}`}
                    placeholder="Describe flavour profile, single origin notes, etc."
                    value={formValues.description}
                    onChange={handleFormChange}
                    rows="3"
                  />
                  {formErrors.description && <span className="field-error-text">{formErrors.description}</span>}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      name="category"
                      className="form-select"
                      value={formValues.category}
                      onChange={handleFormChange}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chocolate Type</label>
                    <input
                      type="text"
                      name="chocolateType"
                      className="form-input"
                      placeholder="Dark, Milk, White, Blonde..."
                      value={formValues.chocolateType}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input
                      type="number"
                      name="price"
                      className={`form-input ${formErrors.price ? 'form-input-error' : ''}`}
                      placeholder="e.g. 240"
                      value={formValues.price}
                      onChange={handleFormChange}
                    />
                    {formErrors.price && <span className="field-error-text">{formErrors.price}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Available Stock *</label>
                    <input
                      type="number"
                      name="stock"
                      className={`form-input ${formErrors.stock ? 'form-input-error' : ''}`}
                      placeholder="e.g. 35"
                      value={formValues.stock}
                      onChange={handleFormChange}
                    />
                    {formErrors.stock && <span className="field-error-text">{formErrors.stock}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    type="url"
                    name="imageUrl"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={formValues.imageUrl}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Flavour Notes (comma-separated)</label>
                  <input
                    type="text"
                    name="flavourTags"
                    className="form-input"
                    placeholder="Caramel, Sea Salt, Roasted Cocoa"
                    value={formValues.flavourTags}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Suitable Occasions (comma-separated)</label>
                  <input
                    type="text"
                    name="occasions"
                    className="form-input"
                    placeholder="Birthday, Anniversary, Thank You"
                    value={formValues.occasions}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Create Product')}
                </button>
                <button type="button" className="btn-outline" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
