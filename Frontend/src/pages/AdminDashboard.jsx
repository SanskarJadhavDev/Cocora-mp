import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  PackageCheck,
  LayoutGrid,
  Clock,
  Plus,
  Search,
  Copy,
  Check,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  ShieldAlert,
  ArrowRight,
  PackageOpen
} from 'lucide-react';
import { productApi, orderApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminShell from '../components/admin/AdminShell';
import KpiCard from '../components/admin/KpiCard';
import StatusBadge from '../components/admin/StatusBadge';
import Money, { formatINR } from '../components/admin/Money';
import EmptyState from '../components/admin/EmptyState';
import ErrorPanel from '../components/admin/ErrorPanel';
import { KpiSkeleton } from '../components/admin/Skeleton';
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

const ORDER_STATUSES = [
  'All',
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled'
];

// Helper to extract the best customer display name & details
function getCustomerInfo(order) {
  const name =
    order.customerDetails?.name ||
    order.user?.name ||
    order.shippingAddress?.name ||
    order.customBoxDetails?.customerDetails?.name ||
    'Customer';

  const city =
    order.customerDetails?.city ||
    order.shippingAddress?.city ||
    order.customBoxDetails?.customerDetails?.city ||
    '';

  const email =
    order.customerDetails?.email ||
    order.user?.email ||
    order.customBoxDetails?.customerDetails?.email ||
    '';

  const phone =
    order.customerDetails?.phone ||
    order.customBoxDetails?.customerDetails?.phone ||
    '';

  const address =
    order.customerDetails?.address ||
    order.shippingAddress?.address ||
    order.customBoxDetails?.customerDetails?.address ||
    '';

  return { name, city, email, phone, address };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, loading: authLoading, logout } = useAuth();

  const [activeSection, setActiveSection] = useState('overview');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Notice banner
  const [feedbackNotice, setFeedbackNotice] = useState('');

  // Modals & confirmation dialogs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status updating map: { [orderId]: boolean }
  const [updatingStatusMap, setUpdatingStatusMap] = useState({});

  // Expanded orders set for inspection
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Copy ref state
  const [copiedRefId, setCopiedRefId] = useState(null);

  // Products filtering & sorting
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('All');
  const [productSort, setProductSort] = useState('newest');

  // Orders filtering & sorting
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState('newest');

  // Product form state
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

  // Data fetcher
  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingData(true);
    setFetchError(null);
    try {
      const [prodRes, ordRes] = await Promise.allSettled([
        productApi.getProducts({ limit: 48, sort: 'newest' }),
        orderApi.getAllOrders()
      ]);

      let hasSuccess = false;
      if (prodRes.status === 'fulfilled' && prodRes.value && prodRes.value.data) {
        setProducts(prodRes.value.data);
        hasSuccess = true;
      }
      if (ordRes.status === 'fulfilled' && ordRes.value && ordRes.value.data) {
        setOrders(ordRes.value.data);
        hasSuccess = true;
      }

      if (!hasSuccess && (prodRes.status === 'rejected' || ordRes.status === 'rejected')) {
        setFetchError('Unable to connect to backend database. Please check your network or server.');
      } else {
        setLastFetchedAt(new Date());
      }
    } catch (err) {
      setFetchError(err.message || 'Error synchronizing operational metrics.');
    } finally {
      setLoadingData(false);
    }
  }, [isAdmin]);

  // Auth & initial load check
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

  // Copy order ref to clipboard
  const handleCopyRef = async (orderRef, e) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(orderRef);
      setCopiedRefId(orderRef);
      setTimeout(() => setCopiedRefId(null), 1800);
    } catch {
      // Fallback
    }
  };

  // Toggle order expansion
  const toggleOrderExpand = (orderId) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Modals
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
      name: product.name || '',
      description: product.description || '',
      category: product.category || 'Dark Chocolate',
      price: product.price ?? '',
      imageUrl: product.image || '',
      stock: product.stock ?? '',
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
          setFeedbackNotice(`Product "${res.data.name}" created and published.`);
          await fetchAdminData();
        }
      }
      closeModal();
    } catch (err) {
      setFeedbackNotice(err.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteProduct = (product) => {
    setDeleteCandidate(product);
  };

  const handleExecuteDelete = async () => {
    if (!deleteCandidate || isDeleting) return;
    setIsDeleting(true);
    try {
      await productApi.deleteProduct(deleteCandidate._id);
      setFeedbackNotice(`Product "${deleteCandidate.name}" removed from catalogue.`);
      setDeleteCandidate(null);
      await fetchAdminData();
    } catch (err) {
      setFeedbackNotice(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Order status update with loading indicator
  const handleOrderStatusChange = async (orderId, newStatus) => {
    const currentOrder = orders.find((o) => o._id === orderId);
    if (currentOrder && currentOrder.status === newStatus) {
      return;
    }
    setUpdatingStatusMap((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await orderApi.updateOrderStatus(orderId, newStatus);
      if (res && res.data) {
        setFeedbackNotice(`Order status updated to "${res.data.status}".`);
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? res.data : o))
        );
        await fetchAdminData();
      }
    } catch (err) {
      setFeedbackNotice(err.message || 'Failed to update order status.');
      await fetchAdminData();
    } finally {
      setUpdatingStatusMap((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        productSearch === '' ||
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.chocolateType?.toLowerCase().includes(productSearch.toLowerCase());
      const matchCat = productCategory === 'All' || p.category === productCategory;
      return matchSearch && matchCat;
    }).sort((a, b) => {
      if (productSort === 'price-low') return a.price - b.price;
      if (productSort === 'price-high') return b.price - a.price;
      if (productSort === 'stock-low') return a.stock - b.stock;
      if (productSort === 'name-az') return a.name.localeCompare(b.name);
      return 0; // default newest
    });
  }, [products, productSearch, productCategory, productSort]);

  // Filtered & sorted orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const matchStatus = orderStatusFilter === 'All' || ord.status === orderStatusFilter;
      const { name, city, email } = getCustomerInfo(ord);
      const matchSearch =
        orderSearch === '' ||
        ord.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        name.toLowerCase().includes(orderSearch.toLowerCase()) ||
        city.toLowerCase().includes(orderSearch.toLowerCase()) ||
        email.toLowerCase().includes(orderSearch.toLowerCase());
      return matchStatus && matchSearch;
    }).sort((a, b) => {
      if (orderSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (orderSort === 'amount-high') return (b.totalAmount || 0) - (a.totalAmount || 0);
      return new Date(b.createdAt) - new Date(a.createdAt); // default newest
    });
  }, [orders, orderStatusFilter, orderSearch, orderSort]);

  // Derived metrics
  const pendingCount = orders.filter((o) => o.status === 'Pending').length;
  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Access denied screen
  if (authLoading) {
    return (
      <div className="admin-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#B9A9C9', fontSize: '14px' }}>Verifying administrative security credentials...</p>
      </div>
    );
  }

  if (isAuthenticated && !isAdmin) {
    return (
      <div className="admin-shell" style={{ alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div
          className="admin-card"
          style={{ maxWidth: '440px', textAlign: 'center', alignItems: 'center', gap: '16px' }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(229, 112, 126, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E5707E'
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: '#E5707E',
                textTransform: 'uppercase'
              }}
            >
              Access Restricted
            </span>
            <h2 style={{ fontSize: '20px', margin: '6px 0 10px', color: '#F7F0E5', fontFamily: 'var(--admin-font-serif)' }}>
              Administrator Clearance Required
            </h2>
            <p style={{ fontSize: '13px', color: '#B9A9C9', lineHeight: 1.5 }}>
              Your account ({user?.email}) is registered as a customer. The kitchen administration console is reserved for authorized staff.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Link to="/" className="admin-btn-primary">
              Return to Store
            </Link>
            <button type="button" className="admin-btn-ghost" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pageTitle =
    activeSection === 'overview'
      ? 'Kitchen Operations & Metrics'
      : activeSection === 'products'
      ? 'Product Catalogue'
      : 'Orders & Dispatch';

  return (
    <AdminShell
      title={pageTitle}
      user={user}
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      productsCount={products.length}
      ordersCount={orders.length}
      onRefresh={fetchAdminData}
      isRefreshing={loadingData}
      lastFetchedAt={lastFetchedAt}
      onLogout={handleLogout}
    >
      {/* Inline Feedback Banner */}
      {feedbackNotice && (
        <div className="admin-notice-banner" role="status">
          <span>{feedbackNotice}</span>
          <button
            type="button"
            className="admin-notice-close"
            onClick={() => setFeedbackNotice('')}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Inline Fetch Error Panel */}
      {fetchError && (
        <ErrorPanel
          message={fetchError}
          onRetry={fetchAdminData}
        />
      )}

      {/* ====================================================================
          SECTION: OVERVIEW
          ==================================================================== */}
      {activeSection === 'overview' && (
        <>
          {/* Responsive 4-Column KPI Grid */}
          <div className="admin-kpis-grid">
            {loadingData && products.length === 0 ? (
              <>
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
              </>
            ) : (
              <>
                <KpiCard
                  title="TOTAL REVENUE"
                  formattedValue={formatINR(totalRevenue)}
                  caption={`From ${orders.length} placed orders`}
                  icon={TrendingUp}
                />
                <KpiCard
                  title="TOTAL ORDERS"
                  value={orders.length}
                  caption={`${pendingCount} pending fulfilment`}
                  icon={PackageCheck}
                />
                <KpiCard
                  title="PRODUCTS IN CATALOGUE"
                  value={products.length}
                  caption="Across 7 approved categories"
                  icon={LayoutGrid}
                />
                <KpiCard
                  title="PENDING DISPATCH"
                  value={pendingCount}
                  caption="Requires chef review"
                  icon={Clock}
                  hasAccent={pendingCount > 0}
                />
              </>
            )}
          </div>

          {/* Two-Column Split: Recent Orders (2/3) + Catalogue Preview (1/3) */}
          <div className="admin-overview-split">
            {/* Recent Orders Card */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">Recent Orders</h2>
                  <p style={{ fontSize: '12px', color: '#B9A9C9', margin: '2px 0 0', opacity: 0.8 }}>
                    Latest transactions awaiting kitchen dispatch
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => setActiveSection('orders')}
                >
                  <span>View all</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="admin-scroll-hint" aria-hidden="true">
                <span>Swipe horizontally for full table &rarr;</span>
              </div>
              <div className="admin-table-container">
                <table className="admin-table" aria-label="Recent Orders">
                  <thead>
                    <tr>
                      <th scope="col">Order Ref</th>
                      <th scope="col">Customer</th>
                      <th scope="col" className="admin-table-text-right">Total</th>
                      <th scope="col">Status</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => {
                      const { name, city, email } = getCustomerInfo(order);
                      const isCopied = copiedRefId === order.orderNumber;
                      return (
                        <tr
                          key={order._id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setActiveSection('orders')}
                          title="Click to view details in Orders section"
                        >
                          <td>
                            <div className="admin-order-ref-cell">
                              <span>{order.orderNumber}</span>
                              <button
                                type="button"
                                className="admin-copy-btn"
                                onClick={(e) => handleCopyRef(order.orderNumber, e)}
                                title="Copy order number"
                                aria-label={`Copy order reference ${order.orderNumber}`}
                              >
                                {isCopied ? <Check size={13} color="#5BC48A" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className="admin-customer-cell">
                              <span className="admin-customer-name">{name}</span>
                              <span className="admin-customer-sub">
                                {city || email || 'Direct Order'}
                              </span>
                            </div>
                          </td>
                          <td className="admin-table-text-right">
                            <strong style={{ color: '#F7F0E5', fontVariantNumeric: 'tabular-nums' }}>
                              <Money amount={order.totalAmount} />
                            </strong>
                          </td>
                          <td>
                            <StatusBadge status={order.status} />
                          </td>
                          <td>
                            <span style={{ fontSize: '12.5px', color: '#B9A9C9', whiteSpace: 'nowrap' }}>
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short'
                                  })
                                : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {orders.length === 0 && !loadingData && (
                      <tr>
                        <td colSpan="5">
                          <EmptyState
                            icon={PackageOpen}
                            title="No orders yet"
                            description="When customers place orders, they will instantly appear here."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Catalogue Quick Preview */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h2 className="admin-card-title">Catalogue Preview</h2>
                  <p style={{ fontSize: '12px', color: '#B9A9C9', margin: '2px 0 0', opacity: 0.8 }}>
                    Active creations in boutique
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => setActiveSection('products')}
                >
                  <span>Manage</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="admin-quick-preview-grid">
                {products.slice(0, 6).map((product) => {
                  const isLow = product.stock > 0 && product.stock <= 10;
                  const isOut = product.stock <= 0;
                  return (
                    <div key={product._id} className="admin-quick-tile">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="admin-quick-thumb"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&q=80';
                        }}
                      />
                      <div className="admin-quick-info">
                        <span className="admin-quick-name" title={product.name}>
                          {product.name}
                        </span>
                        <span className="admin-quick-category">
                          {product.category}
                        </span>
                      </div>
                      <div className="admin-quick-bottom">
                        <span className="admin-quick-price">
                          <Money amount={product.price} />
                        </span>
                        <span
                          className={`admin-quick-stock ${
                            isOut ? 'admin-stock-out' : isLow ? 'admin-stock-low' : 'admin-stock-good'
                          }`}
                        >
                          {isOut ? '0 left' : `${product.stock} pcs`}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {products.length === 0 && !loadingData && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EmptyState
                      icon={LayoutGrid}
                      title="Catalogue is empty"
                      description="Add your first artisanal chocolate to the menu."
                      actionLabel="+ Add Chocolate"
                      onAction={openAddModal}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====================================================================
          SECTION: PRODUCTS
          ==================================================================== */}
      {activeSection === 'products' && (
        <div className="admin-card">
          <div className="admin-toolbar">
            <div className="admin-toolbar-left">
              {/* Search input */}
              <div className="admin-search-wrapper">
                <Search size={16} className="admin-search-icon" />
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search chocolate, flavour, type..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  aria-label="Search products"
                />
              </div>

              {/* Category filter */}
              <select
                className="admin-filter-select"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="All">All Categories ({products.length})</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Sort selector */}
              <select
                className="admin-filter-select"
                value={productSort}
                onChange={(e) => setProductSort(e.target.value)}
                aria-label="Sort products"
              >
                <option value="newest">Newest Additions</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="stock-low">Stock: Low to High</option>
                <option value="name-az">Name: A to Z</option>
              </select>
            </div>

            <button type="button" className="admin-btn-primary" onClick={openAddModal}>
              <Plus size={16} />
              <span>Add New Chocolate</span>
            </button>
          </div>

          {/* Products Table */}
          <div className="admin-scroll-hint" aria-hidden="true">
            <span>Swipe horizontally for full table &rarr;</span>
          </div>
          <div className="admin-table-container">
            <table className="admin-table" aria-label="Product Catalogue">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '64px' }}>Item</th>
                  <th scope="col">Chocolate Details</th>
                  <th scope="col">Category</th>
                  <th scope="col" className="admin-table-text-right">Price</th>
                  <th scope="col">Available Stock</th>
                  <th scope="col" className="admin-table-text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= 10;
                  const isOut = p.stock <= 0;
                  return (
                    <tr key={p._id}>
                      <td>
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{
                            width: '46px',
                            height: '46px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(229, 187, 50, 0.15)'
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&q=80';
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: 600, color: '#F7F0E5' }}>{p.name}</span>
                          <span style={{ fontSize: '12px', color: '#B9A9C9', opacity: 0.8, maxWidth: '380px' }}>
                            {p.description ? p.description.slice(0, 75) + (p.description.length > 75 ? '...' : '') : ''}
                          </span>
                          {p.chocolateType && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: '#E5BB32',
                                marginTop: '2px'
                              }}
                            >
                              {p.chocolateType} Chocolate
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: '#B9A9C9' }}>{p.category}</span>
                      </td>
                      <td className="admin-table-text-right">
                        <strong style={{ color: '#F7F0E5', fontVariantNumeric: 'tabular-nums' }}>
                          <Money amount={p.price} />
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`admin-quick-stock ${
                            isOut ? 'admin-stock-out' : isLow ? 'admin-stock-low' : 'admin-stock-good'
                          }`}
                        >
                          {isOut ? 'Out of stock (0)' : isLow ? `Low stock (${p.stock})` : `${p.stock} in inventory`}
                        </span>
                      </td>
                      <td className="admin-table-text-right">
                        <div className="admin-action-btn-group" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-action-btn admin-action-btn-edit"
                            onClick={() => openEditModal(p)}
                            title="Edit product parameters"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn admin-action-btn-delete"
                            onClick={() => confirmDeleteProduct(p)}
                            title="Delete product from catalogue"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && !loadingData && (
                  <tr>
                    <td colSpan="6">
                      <EmptyState
                        icon={LayoutGrid}
                        title="No matching products"
                        description={
                          productSearch || productCategory !== 'All'
                            ? 'Try refining your search query or category filter.'
                            : 'No chocolates registered in catalogue.'
                        }
                        actionLabel={productSearch || productCategory !== 'All' ? 'Clear Filters' : '+ Add Chocolate'}
                        onAction={
                          productSearch || productCategory !== 'All'
                            ? () => {
                                setProductSearch('');
                                setProductCategory('All');
                              }
                            : openAddModal
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION: ORDERS
          ==================================================================== */}
      {activeSection === 'orders' && (
        <div className="admin-card">
          {/* Status filter chips */}
          <div className="admin-chips-row" role="tablist" aria-label="Filter orders by status">
            {ORDER_STATUSES.map((status) => {
              const count =
                status === 'All'
                  ? orders.length
                  : orders.filter((o) => o.status === status).length;
              const isActive = orderStatusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`admin-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter(status)}
                >
                  <span>{status}</span>
                  <span className="admin-chip-count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Orders search toolbar */}
          <div className="admin-toolbar" style={{ marginBottom: '16px' }}>
            <div className="admin-toolbar-left">
              <div className="admin-search-wrapper">
                <Search size={16} className="admin-search-icon" />
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search by order ref, customer name, city..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  aria-label="Search orders"
                />
              </div>

              <select
                className="admin-filter-select"
                value={orderSort}
                onChange={(e) => setOrderSort(e.target.value)}
                aria-label="Sort orders"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount-high">Amount: High to Low</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="admin-scroll-hint" aria-hidden="true">
            <span>Swipe horizontally for full table &rarr;</span>
          </div>
          <div className="admin-table-container">
            <table className="admin-table" aria-label="Orders Fulfillment">
              <thead>
                <tr>
                  <th scope="col">Order Reference</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Items Summary</th>
                  <th scope="col" className="admin-table-text-right">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">Change Status</th>
                  <th scope="col" style={{ width: '40px' }} aria-label="Details" />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const { name, city, email, phone, address } = getCustomerInfo(ord);
                  const isCopied = copiedRefId === ord.orderNumber;
                  const isUpdating = !!updatingStatusMap[ord._id];
                  const isExpanded = expandedOrders.has(ord._id);

                  return (
                    <React.Fragment key={ord._id}>
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleOrderExpand(ord._id)}
                      >
                        <td>
                          <div className="admin-order-ref-cell">
                            <span>{ord.orderNumber}</span>
                            <button
                              type="button"
                              className="admin-copy-btn"
                              onClick={(e) => handleCopyRef(ord.orderNumber, e)}
                              title="Copy order number"
                              aria-label={`Copy reference ${ord.orderNumber}`}
                            >
                              {isCopied ? <Check size={13} color="#5BC48A" /> : <Copy size={13} />}
                            </button>
                          </div>
                          <p style={{ fontSize: '11.5px', color: '#B9A9C9', margin: '3px 0 0', opacity: 0.75 }}>
                            {ord.createdAt
                              ? new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : '—'}
                          </p>
                        </td>
                        <td>
                          <div className="admin-customer-cell">
                            <span className="admin-customer-name">{name}</span>
                            <span className="admin-customer-sub">
                              {city ? `${city}` : email ? `${email}` : 'Customer'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', color: '#F7F0E5', maxWidth: '280px' }}>
                            {ord.orderType === 'custom_box' ? (
                              <span style={{ color: '#E5BB32', fontWeight: 500 }}>
                                Custom Box (Tray of {ord.customBoxDetails?.traySize || 12})
                              </span>
                            ) : (
                              <span>
                                {ord.items && ord.items.length > 0
                                  ? ord.items.map((i) => `${i.name || i.productName || 'Chocolate'} × ${i.quantity}`).join(', ')
                                  : 'Artisanal Selection'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="admin-table-text-right">
                          <strong style={{ color: '#F7F0E5', fontVariantNumeric: 'tabular-nums' }}>
                            <Money amount={ord.totalAmount} />
                          </strong>
                        </td>
                        <td>
                          <StatusBadge status={ord.status} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className="admin-status-select"
                            value={ord.status}
                            disabled={isUpdating}
                            onChange={(e) => handleOrderStatusChange(ord._id, e.target.value)}
                            aria-label={`Update status for order ${ord.orderNumber}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                          {isUpdating && (
                            <span style={{ fontSize: '11px', color: '#E5BB32', marginLeft: '6px' }}>
                              Updating...
                            </span>
                          )}
                        </td>
                        <td className="admin-table-text-right">
                          <button
                            type="button"
                            className="admin-link-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOrderExpand(ord._id);
                            }}
                            title={isExpanded ? 'Collapse order' : 'Expand order'}
                            aria-expanded={isExpanded}
                            aria-label="Toggle order details"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Order Detail Row */}
                      {isExpanded && (
                        <tr style={{ backgroundColor: 'rgba(46, 26, 69, 0.4)' }}>
                          <td colSpan="7" style={{ padding: '18px 24px' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '16px',
                                fontSize: '12.5px'
                              }}
                            >
                              <div>
                                <span style={{ color: '#B9A9C9', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
                                  Customer & Shipping Contact
                                </span>
                                <p style={{ margin: '4px 0 2px', color: '#F7F0E5', fontWeight: 500 }}>{name}</p>
                                {email && <p style={{ margin: '2px 0', color: '#B9A9C9' }}>Email: {email}</p>}
                                {phone && <p style={{ margin: '2px 0', color: '#B9A9C9' }}>Phone: {phone}</p>}
                                {address && <p style={{ margin: '2px 0', color: '#B9A9C9' }}>Address: {address}</p>}
                                {city && <p style={{ margin: '2px 0', color: '#B9A9C9' }}>City: {city}</p>}
                              </div>

                              <div>
                                <span style={{ color: '#B9A9C9', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
                                  Order Breakdown
                                </span>
                                {ord.orderType === 'custom_box' ? (
                                  <div style={{ marginTop: '4px' }}>
                                    <p style={{ margin: '2px 0', color: '#E5BB32', fontWeight: 500 }}>
                                      Bespoke Gift Box ({ord.customBoxDetails?.traySize || 12} slots)
                                    </p>
                                    {ord.customBoxDetails?.giftMessage && (
                                      <p style={{ margin: '4px 0', color: '#B9A9C9', fontStyle: 'italic' }}>
                                        "{ord.customBoxDetails.giftMessage}"
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <ul style={{ margin: '4px 0 0', paddingLeft: '16px', color: '#F7F0E5' }}>
                                    {ord.items && ord.items.map((it, idx) => (
                                      <li key={idx} style={{ marginBottom: '2px' }}>
                                        {it.name || it.productName || 'Chocolate'} — {it.quantity} × <Money amount={it.unitPrice ?? it.price ?? 0} />
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div>
                                <span style={{ color: '#B9A9C9', fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>
                                  Payment & Fulfillment
                                </span>
                                <p style={{ margin: '4px 0 2px', color: '#F7F0E5' }}>
                                  Payment Method: {ord.paymentMethod || 'Online (Prepaid)'}
                                </p>
                                <p style={{ margin: '2px 0', color: '#F7F0E5' }}>
                                  Total Paid: <Money amount={ord.totalAmount} />
                                </p>
                                <p style={{ margin: '2px 0', color: '#B9A9C9' }}>
                                  Internal ID: <code style={{ fontSize: '11px' }}>{ord._id}</code>
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredOrders.length === 0 && !loadingData && (
                  <tr>
                    <td colSpan="7">
                      <EmptyState
                        icon={PackageOpen}
                        title="No matching orders"
                        description={
                          orderSearch || orderStatusFilter !== 'All'
                            ? 'No orders match your filter criteria.'
                            : 'No customer orders have been placed yet.'
                        }
                        actionLabel={orderSearch || orderStatusFilter !== 'All' ? 'Reset Filters' : undefined}
                        onAction={
                          orderSearch || orderStatusFilter !== 'All'
                            ? () => {
                                setOrderSearch('');
                                setOrderStatusFilter('All');
                              }
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: ADD / EDIT CHOCOLATE
          ==================================================================== */}
      {isModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h2 id="modal-title" className="admin-modal-title">
                {editingProduct ? 'Edit Chocolate Recipe' : 'Add New Chocolate to Catalogue'}
              </h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeModal}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} noValidate>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    className={`admin-form-input ${formErrors.name ? 'admin-form-input-error' : ''}`}
                    placeholder="e.g. Malabar Single-Origin Dark"
                    value={formValues.name}
                    onChange={handleFormChange}
                  />
                  {formErrors.name && <span className="admin-form-error-text">{formErrors.name}</span>}
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Tasting Description *</label>
                  <textarea
                    name="description"
                    className={`admin-form-textarea ${formErrors.description ? 'admin-form-input-error' : ''}`}
                    placeholder="Describe aroma, cocoa percentages, and tasting experience."
                    value={formValues.description}
                    onChange={handleFormChange}
                    rows="3"
                  />
                  {formErrors.description && (
                    <span className="admin-form-error-text">{formErrors.description}</span>
                  )}
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Category *</label>
                    <select
                      name="category"
                      className="admin-form-select"
                      value={formValues.category}
                      onChange={handleFormChange}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Chocolate Type</label>
                    <input
                      type="text"
                      name="chocolateType"
                      className="admin-form-input"
                      placeholder="Dark, Milk, White, Ruby..."
                      value={formValues.chocolateType}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Price (INR) *</label>
                    <input
                      type="number"
                      name="price"
                      className={`admin-form-input ${formErrors.price ? 'admin-form-input-error' : ''}`}
                      placeholder="e.g. 350"
                      value={formValues.price}
                      onChange={handleFormChange}
                    />
                    {formErrors.price && <span className="admin-form-error-text">{formErrors.price}</span>}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Inventory Stock *</label>
                    <input
                      type="number"
                      name="stock"
                      className={`admin-form-input ${formErrors.stock ? 'admin-form-input-error' : ''}`}
                      placeholder="e.g. 50"
                      value={formValues.stock}
                      onChange={handleFormChange}
                    />
                    {formErrors.stock && <span className="admin-form-error-text">{formErrors.stock}</span>}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Product Image URL</label>
                  <input
                    type="url"
                    name="imageUrl"
                    className="admin-form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={formValues.imageUrl}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Flavour Notes (comma-separated)</label>
                  <input
                    type="text"
                    name="flavourTags"
                    className="admin-form-input"
                    placeholder="Smoked Salt, Lavender, Roasted Nibs"
                    value={formValues.flavourTags}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Occasions (comma-separated)</label>
                  <input
                    type="text"
                    name="occasions"
                    className="admin-form-input"
                    placeholder="Anniversary, Diwali Gift, Birthday"
                    value={formValues.occasions}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving to Database...' : editingProduct ? 'Save Changes' : 'Create Chocolate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: DESTRUCTIVE DELETE CONFIRMATION
          ==================================================================== */}
      {deleteCandidate && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setDeleteCandidate(null)}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div
            className="admin-modal-card"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h2 id="delete-dialog-title" className="admin-modal-title" style={{ color: '#E5707E' }}>
                Confirm Deletion
              </h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setDeleteCandidate(null)}
                aria-label="Cancel deletion"
              >
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: '#F7F0E5', fontSize: '14px', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to remove <strong>"{deleteCandidate.name}"</strong> from the Cocora catalogue?
              </p>
              <p style={{ color: '#B9A9C9', fontSize: '12.5px', margin: '8px 0 0', lineHeight: 1.4 }}>
                This will delete the item from the MongoDB database and remove it from the public storefront. This action cannot be reversed.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-ghost"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-action-btn admin-action-btn-delete"
                style={{
                  backgroundColor: 'rgba(229, 112, 126, 0.2)',
                  color: '#E5707E',
                  border: '1px solid rgba(229, 112, 126, 0.5)',
                  padding: '9px 16px',
                  fontWeight: 600
                }}
                disabled={isDeleting}
                onClick={handleExecuteDelete}
              >
                {isDeleting ? 'Deleting...' : 'Delete Chocolate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
