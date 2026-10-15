import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartApi } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const GUEST_CART_KEY = 'cocoraCart';

const calculateTotals = (items = []) => {
  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price || (item.product && item.product.price) || item.unitPrice) || 0;
    const qty = Number(item.quantity) || 1;
    return sum + (price * qty);
  }, 0);
  const deliveryFee = items.length === 0 ? 0 : subtotal >= 1000 ? 0 : 50;
  const totalAmount = subtotal + deliveryFee;

  return {
    items,
    totalItems,
    subtotal,
    deliveryFee,
    totalAmount
  };
};

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cartState, setCartState] = useState(() => {
    try {
      const saved = localStorage.getItem(GUEST_CART_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return calculateTotals(Array.isArray(parsed) ? parsed : []);
    } catch {
      return calculateTotals([]);
    }
  });
  const [loading, setLoading] = useState(false);

  const fetchServerCart = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const response = await cartApi.getCart();
      if (response && response.data) {
        setCartState({
          items: response.data.items || [],
          totalItems: response.data.totalItems || 0,
          subtotal: response.data.subtotal || 0,
          deliveryFee: response.data.deliveryFee || 0,
          totalAmount: response.data.totalAmount || 0
        });
      }
    } catch {
      setCartState(calculateTotals([]));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchServerCart();
    } else {
      try {
        const saved = localStorage.getItem(GUEST_CART_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        setCartState(calculateTotals(Array.isArray(parsed) ? parsed : []));
      } catch {
        setCartState(calculateTotals([]));
      }
    }
  }, [isAuthenticated, fetchServerCart]);

  const addToCart = async (productOrId, quantity = 1) => {
    const productId = typeof productOrId === 'object' ? (productOrId._id || productOrId.id || productOrId.productId) : productOrId;

    if (isAuthenticated) {
      setLoading(true);
      try {
        const response = await cartApi.addItem(productId, quantity);
        if (response && response.data) {
          setCartState({
            items: response.data.items || [],
            totalItems: response.data.totalItems || 0,
            subtotal: response.data.subtotal || 0,
            deliveryFee: response.data.deliveryFee || 0,
            totalAmount: response.data.totalAmount || 0
          });
          return { success: true };
        }
      } catch (err) {
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    } else {
      const currentItems = [...cartState.items];
      const prodName = typeof productOrId === 'object' ? productOrId.name : 'Chocolate';
      const prodPrice = typeof productOrId === 'object' ? Number(productOrId.price) : 200;
      const prodImage = typeof productOrId === 'object' ? productOrId.image : '';

      const existingIndex = currentItems.findIndex((item) => {
        const itemId = item.productId || (item.product && item.product._id) || item._id || item.id;
        return itemId === productId;
      });

      if (existingIndex > -1) {
        currentItems[existingIndex] = {
          ...currentItems[existingIndex],
          quantity: currentItems[existingIndex].quantity + quantity
        };
      } else {
        currentItems.push({
          id: productId,
          productId,
          name: prodName,
          price: prodPrice,
          image: prodImage,
          quantity,
          product: typeof productOrId === 'object' ? productOrId : { _id: productId, name: prodName, price: prodPrice }
        });
      }

      const updated = calculateTotals(currentItems);
      setCartState(updated);
      try {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(currentItems));
      } catch {
        return { success: true };
      }
      return { success: true };
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (isAuthenticated) {
      setLoading(true);
      try {
        const response = await cartApi.updateItem(productId, newQuantity);
        if (response && response.data) {
          setCartState({
            items: response.data.items || [],
            totalItems: response.data.totalItems || 0,
            subtotal: response.data.subtotal || 0,
            deliveryFee: response.data.deliveryFee || 0,
            totalAmount: response.data.totalAmount || 0
          });
        }
      } catch (err) {
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    } else {
      let currentItems = [...cartState.items];
      if (newQuantity <= 0) {
        currentItems = currentItems.filter((item) => {
          const itemId = item.productId || (item.product && item.product._id) || item._id || item.id;
          return itemId !== productId;
        });
      } else {
        currentItems = currentItems.map((item) => {
          const itemId = item.productId || (item.product && item.product._id) || item._id || item.id;
          if (itemId === productId) {
            return { ...item, quantity: newQuantity };
          }
          return item;
        });
      }

      const updated = calculateTotals(currentItems);
      setCartState(updated);
      try {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(currentItems));
      } catch {
        return;
      }
    }
  };

  const removeFromCart = async (productId) => {
    if (isAuthenticated) {
      setLoading(true);
      try {
        const response = await cartApi.removeItem(productId);
        if (response && response.data) {
          setCartState({
            items: response.data.items || [],
            totalItems: response.data.totalItems || 0,
            subtotal: response.data.subtotal || 0,
            deliveryFee: response.data.deliveryFee || 0,
            totalAmount: response.data.totalAmount || 0
          });
        }
      } catch (err) {
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    } else {
      const currentItems = cartState.items.filter((item) => {
        const itemId = item.productId || (item.product && item.product._id) || item._id || item.id;
        return itemId !== productId;
      });
      const updated = calculateTotals(currentItems);
      setCartState(updated);
      try {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(currentItems));
      } catch {
        return;
      }
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await cartApi.clearCart();
      } catch {
        return;
      }
    }
    const empty = calculateTotals([]);
    setCartState(empty);
    try {
      localStorage.removeItem(GUEST_CART_KEY);
    } catch {
      return;
    }
  };

  const cartCount = cartState.totalItems;

  return (
    <CartContext.Provider
      value={{
        cart: cartState,
        cartCount,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart: fetchServerCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
