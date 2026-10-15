const mongoose = require('mongoose');
const { Order, ORDER_STATUSES, ALLOWED_STATUS_TRANSITIONS } = require('../models/Order');
const Cart = require('../models/Cart');
const { Product } = require('../models/Product');
const { calculateDeliveryFee, generateOrderNumber } = require('../utils/orderUtils');
const { sendOrderConfirmationEmail } = require('../services/emailService');

const validateCustomerDetails = (data) => {
  const details = data.customerDetails || data;
  const { name, email, phone, address, city, pincode } = details || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { error: 'Full name is required' };
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return { error: 'Please enter a valid email address' };
  }

  const cleanedPhone = typeof phone === 'string' ? phone.replace(/[\s-]/g, '') : '';
  if (!cleanedPhone || !/^\d{10}$/.test(cleanedPhone)) {
    return { error: 'Please enter a valid 10-digit phone number' };
  }

  if (!address || typeof address !== 'string' || !address.trim()) {
    return { error: 'Delivery address is required' };
  }

  if (!city || typeof city !== 'string' || !city.trim()) {
    return { error: 'City is required' };
  }

  const trimmedPincode = typeof pincode === 'string' ? pincode.trim() : String(pincode || '').trim();
  if (!trimmedPincode || !/^\d{6}$/.test(trimmedPincode)) {
    return { error: 'Please enter a valid 6-digit PIN code' };
  }

  return {
    value: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanedPhone,
      address: address.trim(),
      city: city.trim(),
      pincode: trimmedPincode
    }
  };
};

const checkout = async (req, res, next) => {
  const deductedStock = [];

  try {
    const customerValidation = validateCustomerDetails(req.body);
    if (customerValidation.error) {
      return res.status(400).json({
        success: false,
        message: customerValidation.error
      });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    for (const item of cart.items) {
      if (!item.product || !item.product.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product ? item.product.name : 'Unknown'} is currently unavailable`
        });
      }

      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}, requested: ${item.quantity}`
        });
      }
    }

    let stockFailure = null;
    for (const item of cart.items) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product._id,
          stock: { $gte: item.quantity },
          isAvailable: true
        },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        stockFailure = `Insufficient stock for ${item.product.name}. Order cannot be processed.`;
        break;
      }

      deductedStock.push({
        id: item.product._id,
        quantity: item.quantity
      });
    }

    if (stockFailure) {
      for (const d of deductedStock) {
        await Product.updateOne({ _id: d.id }, { $inc: { stock: d.quantity } });
      }
      return res.status(400).json({
        success: false,
        message: stockFailure
      });
    }

    let subtotal = 0;
    const itemSnapshots = cart.items.map((item) => {
      const unitPrice = item.product.price;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      return {
        product: item.product._id,
        name: item.product.name,
        image: item.product.image,
        unitPrice,
        quantity: item.quantity,
        itemTotal
      };
    });

    const deliveryFee = calculateDeliveryFee(subtotal);
    const totalAmount = subtotal + deliveryFee;
    const orderNumber = generateOrderNumber();

    let order;
    try {
      order = await Order.create({
        orderNumber,
        user: req.user._id,
        items: itemSnapshots,
        subtotal,
        deliveryFee,
        totalAmount,
        customerDetails: customerValidation.value,
        status: 'Pending',
        paymentStatus: 'Unpaid - Payment Integration Pending'
      });
    } catch (createError) {
      for (const d of deductedStock) {
        await Product.updateOne({ _id: d.id }, { $inc: { stock: d.quantity } });
      }
      throw createError;
    }

    cart.items = [];
    await cart.save();

    sendOrderConfirmationEmail(order).catch((err) => {
      console.error('Confirmation email process error:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    if (deductedStock.length > 0) {
      for (const d of deductedStock) {
        await Product.updateOne({ _id: d.id }, { $inc: { stock: d.quantity } });
      }
    }
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Valid status is required. Allowed values: ${ORDER_STATUSES.join(', ')}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const allowedNext = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from "${order.status}" to "${status}"`
      });
    }

    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        );
      }
    }

    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkout,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
};
