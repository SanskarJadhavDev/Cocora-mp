const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const { Product } = require('../models/Product');
const { calculateDeliveryFee } = require('../utils/orderUtils');

const buildCartDetails = (cart) => {
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return {
      _id: cart ? cart._id : null,
      items: [],
      totalItems: 0,
      subtotal: 0,
      deliveryFee: 0,
      totalAmount: 0
    };
  }

  const activeItems = [];
  let subtotal = 0;
  let totalItems = 0;

  for (const item of cart.items) {
    if (item.product && item.product.isAvailable) {
      const price = item.product.price || 0;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      totalItems += item.quantity;

      activeItems.push({
        product: {
          _id: item.product._id,
          name: item.product.name,
          slug: item.product.slug,
          price: item.product.price,
          image: item.product.image,
          category: item.product.category,
          stock: item.product.stock,
          isAvailable: item.product.isAvailable
        },
        quantity: item.quantity,
        itemTotal
      });
    }
  }

  const deliveryFee = calculateDeliveryFee(subtotal);
  const totalAmount = subtotal + deliveryFee;

  return {
    _id: cart._id,
    items: activeItems,
    totalItems,
    subtotal,
    deliveryFee,
    totalAmount
  };
};

const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name slug price image category stock isAvailable'
    );

    const formattedCart = buildCartDetails(cart);

    return res.status(200).json({
      success: true,
      data: formattedCart
    });
  } catch (error) {
    next(error);
  }
};

const addCartItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid productId is required'
      });
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer'
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isAvailable) {
      return res.status(404).json({
        success: false,
        message: 'Product not available or does not exist'
      });
    }

    if (product.stock < parsedQuantity) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock} available)`
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: []
      });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (existingIndex > -1) {
      const newTotalQuantity = cart.items[existingIndex].quantity + parsedQuantity;
      if (newTotalQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Requested total quantity (${newTotalQuantity}) exceeds available stock (${product.stock} available)`
        });
      }
      cart.items[existingIndex].quantity = newTotalQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity: parsedQuantity
      });
    }

    await cart.save();

    await cart.populate(
      'items.product',
      'name slug price image category stock isAvailable'
    );

    return res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: buildCartDetails(cart)
    });
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid productId is required'
      });
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer'
      });
    }

    const product = await Product.findById(productId);
    if (!product || !product.isAvailable) {
      return res.status(404).json({
        success: false,
        message: 'Product not available or does not exist'
      });
    }

    if (product.stock < parsedQuantity) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock} available)`
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }

    cart.items[itemIndex].quantity = parsedQuantity;
    await cart.save();

    await cart.populate(
      'items.product',
      'name slug price image category stock isAvailable'
    );

    return res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: buildCartDetails(cart)
    });
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid productId is required'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    await cart.populate(
      'items.product',
      'name slug price image category stock isAvailable'
    );

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: buildCartDetails(cart)
    });
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        _id: cart ? cart._id : null,
        items: [],
        totalItems: 0,
        subtotal: 0,
        deliveryFee: 0,
        totalAmount: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart
};
