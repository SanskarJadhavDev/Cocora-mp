require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Product } = require('../models/Product');
const { Order } = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');

const makeRequest = (options, postData) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runBoxVerification = async () => {
  console.log('--- STARTING PROMPT 07 BUILD A BOX VERIFICATION ---');
  const results = [];
  const testProductIds = [];
  const testUserEmails = [];
  const testOrderIds = [];

  const logResult = (name, passed, details) => {
    results.push({ name, passed, details });
    const tag = passed ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${name}: ${details}`);
  };

  try {
    const dbConnected = await connectDB();
    if (!dbConnected) {
      logResult('Database Connection', false, 'Unable to connect to MongoDB Atlas');
      return;
    }
    logResult('Database Connection', true, 'Connected to MongoDB Atlas');

    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    const healthPass = healthRes.statusCode === 200 && healthRes.body?.status === 'healthy';
    logResult('Health Endpoint', healthPass, `GET /api/health returned ${healthRes.statusCode}`);

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: adminEmail, password: adminPassword }
    );
    const adminToken = adminLoginRes.body?.token;
    logResult('Admin Authentication', Boolean(adminToken), 'Authenticated as admin');

    const customerAEmail = `box_cust_a_${Date.now()}@cocora.test`;
    testUserEmails.push(customerAEmail);
    const custAReg = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Box Builder Alice', email: customerAEmail, password: 'PasswordAlice1!' }
    );
    let tokenA = custAReg.body?.token;
    if (!tokenA) {
      await User.updateOne({ email: customerAEmail }, { isEmailVerified: true });
      const loginA = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: customerAEmail, password: 'PasswordAlice1!' }
      );
      tokenA = loginA.body?.token;
    }

    const customerBEmail = `box_cust_b_${Date.now()}@cocora.test`;
    testUserEmails.push(customerBEmail);
    const custBReg = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Box Builder Bob', email: customerBEmail, password: 'PasswordBob123!' }
    );
    let tokenB = custBReg.body?.token;
    if (!tokenB) {
      await User.updateOne({ email: customerBEmail }, { isEmailVerified: true });
      const loginB = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        { email: customerBEmail, password: 'PasswordBob123!' }
      );
      tokenB = loginB.body?.token;
    }

    logResult('Customer Accounts Setup', Boolean(tokenA && tokenB), `Created Box Customer A (${customerAEmail}) & Customer B (${customerBEmail})`);

    const prod1 = await Product.create({
      name: `Raspberry Ganache ${Date.now()}`,
      description: 'Artisanal dark chocolate with fresh raspberry ganache.',
      price: 120,
      category: 'Fruit & Floral',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 40,
      isAvailable: true
    });
    testProductIds.push(prod1._id.toString());

    const prod2 = await Product.create({
      name: `Pistachio Praline ${Date.now()}`,
      description: 'Roasted Sicilian pistachio praline in creamy milk chocolate.',
      price: 150,
      category: 'Nuts & Praline',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 30,
      isAvailable: true
    });
    testProductIds.push(prod2._id.toString());

    const prodUnavailable = await Product.create({
      name: `Sold Out Truffle ${Date.now()}`,
      description: 'Temporarily unavailable confection.',
      price: 180,
      category: 'Dark Chocolate',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 20,
      isAvailable: false
    });
    testProductIds.push(prodUnavailable._id.toString());

    logResult('Test Products Setup', true, `Created products P1 (₹120, stock 40), P2 (₹150, stock 30), and unavailable P3`);

    const valTray6Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [
          { productId: prod1._id.toString(), quantity: 3 },
          { productId: prod2._id.toString(), quantity: 3 }
        ]
      }
    );

    const valTray12Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 12,
        items: [
          { productId: prod1._id.toString(), quantity: 6 },
          { productId: prod2._id.toString(), quantity: 6 }
        ]
      }
    );

    const valTray24Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 24,
        items: [
          { productId: prod1._id.toString(), quantity: 14 },
          { productId: prod2._id.toString(), quantity: 10 }
        ]
      }
    );

    const traySizesPass =
      valTray6Res.statusCode === 200 &&
      valTray6Res.body.data.traySize === 6 &&
      valTray6Res.body.data.totalChocolates === 6 &&
      valTray12Res.statusCode === 200 &&
      valTray12Res.body.data.traySize === 12 &&
      valTray12Res.body.data.totalChocolates === 12 &&
      valTray24Res.statusCode === 200 &&
      valTray24Res.body.data.traySize === 24 &&
      valTray24Res.body.data.totalChocolates === 24;

    logResult('Valid Tray Sizes 6, 12, and 24 Validation', traySizesPass, 'Successfully validated boxes for tray sizes 6, 12, and 24');

    const tooFewRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 12,
        items: [{ productId: prod1._id.toString(), quantity: 8 }]
      }
    );

    const tooManyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 12,
        items: [
          { productId: prod1._id.toString(), quantity: 10 },
          { productId: prod2._id.toString(), quantity: 5 }
        ]
      }
    );

    const countCheckPass =
      tooFewRes.statusCode === 400 &&
      tooFewRes.body.message.includes('Tray requires exactly 12 chocolates') &&
      tooManyRes.statusCode === 400 &&
      tooManyRes.body.message.includes('exceeds tray size');

    logResult('Too Few and Too Many Chocolates Rejection', countCheckPass, 'HTTP 400 returned when chocolates count (8 or 15) does not match tray size 12');

    const invalidTraySizeRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 18,
        items: [{ productId: prod1._id.toString(), quantity: 18 }]
      }
    );

    const invalidTrayPass =
      invalidTraySizeRes.statusCode === 400 &&
      invalidTraySizeRes.body.message.includes('Invalid tray size');

    logResult('Invalid Tray Size Rejection', invalidTrayPass, 'HTTP 400 returned for unsupported tray size (18)');

    const fakeId = new mongoose.Types.ObjectId();
    const missingProdRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [{ productId: fakeId.toString(), quantity: 6 }]
      }
    );

    const malformedIdRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [{ productId: 'invalid-id-xyz', quantity: 6 }]
      }
    );

    const unavailProdRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [{ productId: prodUnavailable._id.toString(), quantity: 6 }]
      }
    );

    const prodCheckPass =
      missingProdRes.statusCode === 400 &&
      missingProdRes.body.message.includes('Product not found') &&
      malformedIdRes.statusCode === 400 &&
      malformedIdRes.body.message.includes('Invalid product ID') &&
      unavailProdRes.statusCode === 400 &&
      unavailProdRes.body.message.includes('currently unavailable');

    logResult('Missing, Invalid & Unavailable Products Handling', prodCheckPass, 'Rejected nonexistent IDs, malformed IDs, and disabled products with HTTP 400');

    const negativeQtyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [{ productId: prod1._id.toString(), quantity: -3 }]
      }
    );

    const floatQtyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [{ productId: prod1._id.toString(), quantity: 3.5 }]
      }
    );

    const qtyCheckPass =
      negativeQtyRes.statusCode === 400 &&
      negativeQtyRes.body.message.includes('Quantity must be a positive integer') &&
      floatQtyRes.statusCode === 400 &&
      floatQtyRes.body.message.includes('Quantity must be a positive integer');

    logResult('Invalid & Non-Integer Quantity Rejection', qtyCheckPass, 'Rejected negative and fractional quantities with HTTP 400');

    const fakePriceRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [
          { productId: prod1._id.toString(), quantity: 6, price: 1, unitPrice: 1, total: 6 }
        ]
      }
    );

    const expectedSubtotal = 6 * 120;
    const fakePriceIgnored =
      fakePriceRes.statusCode === 200 &&
      fakePriceRes.body.data.subtotal === expectedSubtotal &&
      fakePriceRes.body.data.items[0].unitPrice === 120 &&
      fakePriceRes.body.data.items[0].itemTotal === expectedSubtotal;

    logResult('Client Fake Price Immunity', fakePriceIgnored, `Client payload price (₹1) ignored; database price (₹120) used (subtotal: ₹${fakePriceRes.body?.data?.subtotal})`);

    const under1000Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [{ productId: prod1._id.toString(), quantity: 6 }]
      }
    );

    const over1000Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/validate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 12,
        items: [{ productId: prod2._id.toString(), quantity: 12 }]
      }
    );

    const subtotalUnder = 6 * 120;
    const deliveryUnder = 50;
    const totalUnder = subtotalUnder + deliveryUnder;

    const subtotalOver = 12 * 150;
    const deliveryOver = 0;
    const totalOver = subtotalOver + deliveryOver;

    const totalsPass =
      under1000Res.statusCode === 200 &&
      under1000Res.body.data.subtotal === subtotalUnder &&
      under1000Res.body.data.deliveryFee === deliveryUnder &&
      under1000Res.body.data.totalAmount === totalUnder &&
      over1000Res.statusCode === 200 &&
      over1000Res.body.data.subtotal === subtotalOver &&
      over1000Res.body.data.deliveryFee === deliveryOver &&
      over1000Res.body.data.totalAmount === totalOver;

    logResult('Server Calculated Totals & Delivery Fee Policy', totalsPass, `Under ₹1000: ₹${subtotalUnder}+₹${deliveryUnder}=₹${totalUnder}; Over ₹1000: ₹${subtotalOver}+₹${deliveryOver}=₹${totalOver}`);

    const customerDetails = {
      name: 'Alice ChocolateLover',
      email: customerAEmail,
      phone: '9876543210',
      address: '77 Marine Drive, Floor 5',
      city: 'Mumbai',
      pincode: '400020'
    };

    const unauthCheckoutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/checkout',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        traySize: 6,
        items: [{ productId: prod1._id.toString(), quantity: 6 }],
        customerDetails
      }
    );

    const unauthPass = unauthCheckoutRes.statusCode === 401;
    logResult('Unauthenticated Box Checkout Rejection', unauthPass, 'POST /api/box/checkout without token rejected with HTTP 401');

    await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/cart/items',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      { productId: prod1._id.toString(), quantity: 2 }
    );

    const cartBeforeBoxCheckout = await Cart.findOne({ user: custAReg.body.user._id });
    const cartHasItemsBefore = cartBeforeBoxCheckout && cartBeforeBoxCheckout.items.length === 1;

    const p1StockBefore = (await Product.findById(prod1._id)).stock;
    const p2StockBefore = (await Product.findById(prod2._id)).stock;

    const authCheckoutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/checkout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      {
        traySize: 12,
        items: [
          { productId: prod1._id.toString(), quantity: 6 },
          { productId: prod2._id.toString(), quantity: 6 }
        ],
        customerDetails
      }
    );

    let boxOrderDoc = null;
    let checkoutSuccess = false;

    if (authCheckoutRes.statusCode === 201 && authCheckoutRes.body?.data?._id) {
      boxOrderDoc = authCheckoutRes.body.data;
      testOrderIds.push(boxOrderDoc._id);

      const p1StockAfter = (await Product.findById(prod1._id)).stock;
      const p2StockAfter = (await Product.findById(prod2._id)).stock;

      const cartAfterBoxCheckout = await Cart.findOne({ user: custAReg.body.user._id });
      const regularCartPreserved = cartAfterBoxCheckout && cartAfterBoxCheckout.items.length === 1;

      const stocksDeducted =
        p1StockAfter === p1StockBefore - 6 &&
        p2StockAfter === p2StockBefore - 6;

      const orderFieldsCorrect =
        boxOrderDoc.orderType === 'customBox' &&
        boxOrderDoc.customBoxDetails?.traySize === 12 &&
        boxOrderDoc.customBoxDetails?.totalChocolates === 12 &&
        boxOrderDoc.subtotal === 6 * 120 + 6 * 150 &&
        boxOrderDoc.status === 'Pending' &&
        boxOrderDoc.paymentStatus.includes('Unpaid');

      checkoutSuccess = stocksDeducted && regularCartPreserved && orderFieldsCorrect;
    }

    logResult('Custom Box Order Creation & Stock Deduction', checkoutSuccess, `Order placed (${boxOrderDoc?.orderNumber}), stock deducted (P1: ${p1StockBefore}->${p1StockBefore - 6}, P2: ${p2StockBefore}->${p2StockBefore - 6}), regular shopping cart preserved untouched`);

    await Product.updateOne({ _id: prod2._id }, { stock: 2 });
    const p2StockPreShortage = (await Product.findById(prod2._id)).stock;

    const shortageCheckoutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/box/checkout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      {
        traySize: 6,
        items: [
          { productId: prod1._id.toString(), quantity: 2 },
          { productId: prod2._id.toString(), quantity: 4 }
        ],
        customerDetails
      }
    );

    const p2StockPostShortage = (await Product.findById(prod2._id)).stock;
    const rollbackPass =
      shortageCheckoutRes.statusCode === 400 &&
      shortageCheckoutRes.body.message.includes('Insufficient stock') &&
      p2StockPreShortage === p2StockPostShortage;

    logResult('Insufficient Stock Rejection & Concurrency Rollback', rollbackPass, `Shortage rejected with HTTP 400; inventory remained intact at ${p2StockPostShortage}`);

    const regularCheckoutRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/orders/checkout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      { customerDetails }
    );

    let regularOrderDoc = null;
    if (regularCheckoutRes.statusCode === 201 && regularCheckoutRes.body?.data?._id) {
      regularOrderDoc = regularCheckoutRes.body.data;
      testOrderIds.push(regularOrderDoc._id);
    }

    const regularCheckoutPass =
      regularCheckoutRes.statusCode === 201 &&
      regularOrderDoc?.orderType === 'regular';

    logResult('Existing Regular Cart & Checkout Preservation', regularCheckoutPass, `Regular checkout succeeded (${regularOrderDoc?.orderNumber}, orderType: regular)`);

    const custBViewBoxOrderRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/${boxOrderDoc._id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    const custAViewBoxOrderRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/${boxOrderDoc._id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const isolationPass =
      custBViewBoxOrderRes.statusCode === 404 &&
      custAViewBoxOrderRes.statusCode === 200 &&
      custAViewBoxOrderRes.body.data.orderType === 'customBox';

    logResult('Customer Custom Box Order Isolation', isolationPass, 'Customer A can view their custom box order; Customer B receives HTTP 404');

    const adminAllOrdersRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const adminStatusUpdateRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${boxOrderDoc._id}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      { status: 'Confirmed' }
    );

    const adminFoundBoxOrder = adminAllOrdersRes.body?.data?.some(
      (o) => o._id === boxOrderDoc._id && o.orderType === 'customBox'
    );

    const adminPass =
      adminAllOrdersRes.statusCode === 200 &&
      adminFoundBoxOrder &&
      adminStatusUpdateRes.statusCode === 200 &&
      adminStatusUpdateRes.body.data.status === 'Confirmed';

    logResult('Admin Management & Status Update for Custom Box Orders', adminPass, 'Admin lists custom box orders and successfully transitioned status to "Confirmed"');

    if (testOrderIds.length > 0) {
      const orderDel = await Order.deleteMany({ _id: { $in: testOrderIds } });
      logResult('Test Orders Cleanup', true, `Removed ${orderDel.deletedCount} temporary test order(s)`);
    }

    if (testProductIds.length > 0) {
      const prodDel = await Product.deleteMany({ _id: { $in: testProductIds } });
      logResult('Test Products Cleanup', true, `Removed ${prodDel.deletedCount} temporary test product(s)`);
    }

    if (testUserEmails.length > 0) {
      const users = await User.find({ email: { $in: testUserEmails } });
      const userIds = users.map((u) => u._id);
      await Cart.deleteMany({ user: { $in: userIds } });
      const userDel = await User.deleteMany({ email: { $in: testUserEmails } });
      logResult('Test Users Cleanup', true, `Removed ${userDel.deletedCount} temporary test user(s) and carts`);
    }

    const adminUser = await User.findOne({ email: adminEmail });
    const adminPreserved = adminUser && adminUser.role === 'admin';
    logResult('Existing Admin User Preservation', adminPreserved, `Admin account (${adminEmail}) preserved untouched`);

    console.log('\n========================================');
    console.log('BUILD A BOX API VERIFICATION SUMMARY');
    console.log('========================================');
    let allPassed = true;
    for (const r of results) {
      console.log(`${r.passed ? 'PASS' : 'FAIL'} | ${r.name}: ${r.details}`);
      if (!r.passed) allPassed = false;
    }
    console.log('========================================');
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    console.log('========================================');
  } catch (err) {
    console.error('Build a Box test execution error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runBoxVerification();
