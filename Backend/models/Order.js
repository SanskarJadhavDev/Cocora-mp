const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled'
];

const ALLOWED_STATUS_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: []
};

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      required: true,
      trim: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer'
      }
    },
    itemTotal: {
      type: Number,
      required: true,
      min: [0, 'Item total cannot be negative']
    }
  },
  {
    _id: false
  }
);

const customerDetailsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Customer delivery address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Customer city is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Customer PIN code is required'],
      trim: true
    }
  },
  {
    _id: false
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: {
      type: [orderItemSnapshotSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: [0, 'Delivery fee cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative']
    },
    customerDetails: {
      type: customerDetailsSchema,
      required: true
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Pending'
    },
    paymentStatus: {
      type: String,
      default: 'Unpaid - Payment Integration Pending'
    },
    orderType: {
      type: String,
      enum: ['regular', 'customBox'],
      default: 'regular'
    },
    customBoxDetails: {
      traySize: {
        type: Number,
        enum: [6, 12, 24]
      },
      totalChocolates: {
        type: Number
      }
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = {
  Order,
  ORDER_STATUSES,
  ALLOWED_STATUS_TRANSITIONS
};
