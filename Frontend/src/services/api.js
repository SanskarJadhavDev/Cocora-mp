const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'cocoraToken';
const USER_KEY = 'cocoraUser';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    return;
  }
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    return;
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    return;
  }
};

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
};

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
        clearSession();
        window.dispatchEvent(new CustomEvent('cocora:auth-expired'));
      }
      const error = new Error((data && data.message) || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    const networkError = new Error('Server is unreachable. Please make sure the Cocora backend is running.');
    networkError.status = 0;
    throw networkError;
  }
}

export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  getMe: () => request('/auth/me', { method: 'GET' }),
  verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: (email) => request('/auth/resend-verification', { method: 'POST', body: { email } }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  verifyResetOtp: (email, otp) => request('/auth/verify-reset-otp', { method: 'POST', body: { email, otp } }),
  resetPassword: (email, resetToken, newPassword) => request('/auth/reset-password', { method: 'POST', body: { email, resetToken, newPassword } })
};

export const productApi = {
  getProducts: (params) => request(`/products${buildQueryString(params)}`, { method: 'GET' }),
  getCategories: () => request('/products/categories', { method: 'GET' }),
  getFeatured: () => request('/products/featured', { method: 'GET' }),
  getProductById: (id) => request(`/products/${id}`, { method: 'GET' }),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' })
};

export const cartApi = {
  getCart: () => request('/cart', { method: 'GET' }),
  addItem: (productId, quantity = 1) => request('/cart/items', { method: 'POST', body: { productId, quantity } }),
  updateItem: (productId, quantity) => request(`/cart/items/${productId}`, { method: 'PUT', body: { quantity } }),
  removeItem: (productId) => request(`/cart/items/${productId}`, { method: 'DELETE' }),
  clearCart: () => request('/cart', { method: 'DELETE' })
};

export const orderApi = {
  checkout: (payload) => request('/orders/checkout', { method: 'POST', body: payload }),
  getMyOrders: () => request('/orders/my-orders', { method: 'GET' }),
  getOrderById: (id) => request(`/orders/${id}`, { method: 'GET' }),
  getAllOrders: () => request('/orders', { method: 'GET' }),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } })
};

export const boxApi = {
  validateBox: (payload) => request('/box/validate', { method: 'POST', body: payload }),
  checkoutBox: (payload) => request('/box/checkout', { method: 'POST', body: payload })
};

export const giftFinderApi = {
  recommend: (payload) => request('/gift-finder/recommend', { method: 'POST', body: payload })
};

export default {
  getToken,
  setToken,
  getUser,
  setUser,
  clearSession,
  authApi,
  productApi,
  cartApi,
  orderApi,
  boxApi,
  giftFinderApi
};
