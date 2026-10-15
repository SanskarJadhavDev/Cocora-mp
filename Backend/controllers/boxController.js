const mongoose = require('mongoose');
const { Product } = require('../models/Product');
const { Order } = require('../models/Order');
const { calculateDeliveryFee, generateOrderNumber } = require('../utils/orderUtils');
const { sendOrderConfirmationEmail } = require('../services/emailService');

const normalizeBoxItems = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'Chocolates selection is required and must be a non-empty array' };
  }

  const itemMap = new Map();

  for (const entry of rawItems) {
    let productId = null;
    let quantity = 1;

    if (typeof entry === 'string') {
      productId = entry.trim();
    } else if (typeof entry === 'object' && entry !== null) {
      productId = entry.productId || entry.id || entry.product;
      if (typeof productId === 'object' && productId !== null && productId._id) {
        productId = productId._id;
      }
      if (productId) {
        productId = String(productId).trim();
      }

      if (entry.quantity !== undefined && entry.quantity !== null) {
        const parsedQty = Number(entry.quantity);
        if (!Number.isInteger(parsedQty) || parsedQty < 1) {
          return { error: 'Quantity must be a positive integer' };
        }
        quantity = parsedQty;
      }
    }

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return { error: `Invalid product ID: ${productId}` };
    }

    const existingQty = itemMap.get(productId) || 0;
    itemMap.set(productId, existingQty + quantity);
  }

  const normalized = [];
  for (const [productId, quantity] of itemMap.entries()) {
    normalized.push({ productId, quantity });
  }

  return { value: normalized };
};

const validateBoxSelection = async (traySize, rawItems) => {
  const allowedSizes = [6, 12, 24];
  const parsedSize = Number(traySize);

  if (!Number.isInteger(parsedSize) || !allowedSizes.includes(parsedSize)) {
    return { error: 'Invalid tray size. Supported sizes: 6, 12, 24' };
  }

  const normalizedResult = normalizeBoxItems(rawItems);
  if (normalizedResult.error) {
    return { error: normalizedResult.error };
  }

  const normalizedItems = normalizedResult.value;
  const totalChocolates = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

  if (totalChocolates < parsedSize) {
    return {
      error: `Tray requires exactly ${parsedSize} chocolates, but only ${totalChocolates} selected`
    };
  }

  if (totalChocolates > parsedSize) {
    return {
      error: `Total chocolates (${totalChocolates}) exceeds tray size of ${parsedSize}`
    };
  }

  const productIds = normalizedItems.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } });

  const productMap = new Map();
  products.forEach((p) => {
    productMap.set(p._id.toString(), p);
  });

  const validatedItems = [];
  let subtotal = 0;

  for (const item of normalizedItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      return { error: `Product not found: ${item.productId}` };
    }

    if (!product.isAvailable) {
      return { error: `Product "${product.name}" is currently unavailable` };
    }

    if (product.stock < item.quantity) {
      return {
        error: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`
      };
    }

    const unitPrice = product.price;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;

    validatedItems.push({
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.image,
        category: product.category,
        stock: product.stock,
        isAvailable: product.isAvailable
      },
      quantity: item.quantity,
      unitPrice,
      itemTotal
    });
  }

  const deliveryFee = calculateDeliveryFee(subtotal);
  const totalAmount = subtotal + deliveryFee;

  return {
    value: {
      traySize: parsedSize,
      totalChocolates,
      items: validatedItems,
      subtotal,
      deliveryFee,
      totalAmount
    }
  };
};

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

const validateBox = async (req, res, next) => {
  try {
    const { traySize } = req.body;
    const items = req.body.items || req.body.chocolates;

    const validation = await validateBoxSelection(traySize, items);
    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Custom box validated successfully',
      data: validation.value
    });
  } catch (error) {
    next(error);
  }
};

const checkoutBox = async (req, res, next) => {
  const deductedStock = [];

  try {
    const { traySize } = req.body;
    const items = req.body.items || req.body.chocolates;

    const boxValidation = await validateBoxSelection(traySize, items);
    if (boxValidation.error) {
      return res.status(400).json({
        success: false,
        message: boxValidation.error
      });
    }

    const customerValidation = validateCustomerDetails(req.body);
    if (customerValidation.error) {
      return res.status(400).json({
        success: false,
        message: customerValidation.error
      });
    }

    const boxData = boxValidation.value;

    let stockFailure = null;
    for (const item of boxData.items) {
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
        stockFailure = `Insufficient stock for "${item.product.name}". Order cannot be processed.`;
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

    const itemSnapshots = boxData.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      image: item.product.image,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      itemTotal: item.itemTotal
    }));

    const orderNumber = generateOrderNumber();

    let order;
    try {
      order = await Order.create({
        orderNumber,
        user: req.user._id,
        items: itemSnapshots,
        subtotal: boxData.subtotal,
        deliveryFee: boxData.deliveryFee,
        totalAmount: boxData.totalAmount,
        customerDetails: customerValidation.value,
        status: 'Pending',
        paymentStatus: 'Unpaid - Payment Integration Pending',
        orderType: 'customBox',
        customBoxDetails: {
          traySize: boxData.traySize,
          totalChocolates: boxData.totalChocolates
        }
      });
    } catch (orderError) {
      for (const d of deductedStock) {
        await Product.updateOne({ _id: d.id }, { $inc: { stock: d.quantity } });
      }
      throw orderError;
    }

    sendOrderConfirmationEmail(order).catch((err) => {
      console.error('Confirmation email process error:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Custom box order placed successfully',
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

module.exports = {
  validateBox,
  checkoutBox,
  normalizeBoxItems,
  validateBoxSelection
};
