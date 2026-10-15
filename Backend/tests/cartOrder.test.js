require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Product } = require('../models/Product');
const { Order } = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');
const { sendOrderConfirmationEmail } = require('../services/emailService');

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

const runCartAndOrderVerification = async () => {
  console.log('--- STARTING PROMPT 06 CART & ORDER VERIFICATION ---');
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

    const customerAEmail = `cust_a_${Date.now()}@cocora.test`;
    testUserEmails.push(customerAEmail);
    const custAReg = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Customer Alice', email: customerAEmail, password: 'PasswordAlice1!' }
    );
    const tokenA = custAReg.body?.token;

    const customerBEmail = `cust_b_${Date.now()}@cocora.test`;
    testUserEmails.push(customerBEmail);
    const custBReg = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Customer Bob', email: customerBEmail, password: 'PasswordBob123!' }
    );
    const tokenB = custBReg.body?.token;

    logResult('Customer Accounts Setup', Boolean(tokenA && tokenB), `Created Customer A (${customerAEmail}) & Customer B (${customerBEmail})`);

    const prod1Doc = await Product.create({
      name: `Artisan Dark Truffle ${Date.now()}`,
      description: 'Single origin dark truffle handcrafted in small batches.',
      price: 400,
      category: 'Dark Chocolate',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 10,
      isAvailable: true
    });
    testProductIds.push(prod1Doc._id.toString());

    const prod2Doc = await Product.create({
      name: `Sea Salt Caramel Bar ${Date.now()}`,
      description: 'Gourmet milk chocolate bar with crunchy sea salt caramel.',
      price: 250,
      category: 'Milk Chocolate',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 5,
      isAvailable: true
    });
    testProductIds.push(prod2Doc._id.toString());

    const prodDisabled = await Product.create({
      name: `Unavailable Mint Crunch ${Date.now()}`,
      description: 'Temporarily unavailable mint chocolate.',
      price: 300,
      category: 'Fruit & Floral',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 10,
      isAvailable: false
    });
    testProductIds.push(prodDisabled._id.toString());

    logResult('Test Products Setup', true, `Created active products (${prod1Doc._id}, ${prod2Doc._id}) and unavailable product (${prodDisabled._id})`);

    const initialCartRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cart',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const emptyCartPass =
      initialCartRes.statusCode === 200 &&
      Array.isArray(initialCartRes.body?.data?.items) &&
      initialCartRes.body.data.items.length === 0 &&
      initialCartRes.body.data.subtotal === 0 &&
      initialCartRes.body.data.deliveryFee === 0 &&
      initialCartRes.body.data.totalAmount === 0;

    logResult('Initial Empty Cart Check', emptyCartPass, 'GET /api/cart returns valid empty cart structure with zero totals');

    const addRes1 = await makeRequest(
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
      { productId: prod1Doc._id.toString(), quantity: 2 }
    );

    const addPass1 =
      addRes1.statusCode === 200 &&
      addRes1.body?.data?.items?.length === 1 &&
      addRes1.body.data.items[0].quantity === 2 &&
      addRes1.body.data.subtotal === 800 &&
      addRes1.body.data.deliveryFee === 50 &&
      addRes1.body.data.totalAmount === 850;

    logResult('Add Item to Cart & Total Calculation', addPass1, 'Added 2x Product 1 (subtotal: 800, delivery: 50, total: 850)');

    const addDupRes = await makeRequest(
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
      { productId: prod1Doc._id.toString(), quantity: 1 }
    );

    const dupPass =
      addDupRes.statusCode === 200 &&
      addDupRes.body?.data?.items?.length === 1 &&
      addDupRes.body.data.items[0].quantity === 3 &&
      addDupRes.body.data.subtotal === 1200 &&
      addDupRes.body.data.deliveryFee === 0 &&
      addDupRes.body.data.totalAmount === 1200;

    logResult('Duplicate Product Cart Merging & Free Delivery Threshold', dupPass, 'Incremented quantity to 3; subtotal >= 1000 triggered free delivery');

    const updateRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/cart/items/${prod1Doc._id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      { quantity: 2 }
    );

    const updatePass =
      updateRes.statusCode === 200 &&
      updateRes.body?.data?.items[0]?.quantity === 2 &&
      updateRes.body.data.subtotal === 800;

    logResult('Update Cart Item Quantity', updatePass, 'Updated quantity from 3 to 2, subtotal recalculated to 800');

    const addProd2Res = await makeRequest(
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
      { productId: prod2Doc._id.toString(), quantity: 2 }
    );

    const addProd2Pass =
      addProd2Res.statusCode === 200 &&
      addProd2Res.body?.data?.items?.length === 2 &&
      addProd2Res.body.data.subtotal === 1300 &&
      addProd2Res.body.data.totalAmount === 1300;

    logResult('Multiple Items in Cart', addProd2Pass, 'Cart contains 2 distinct items (subtotal: 1300, free delivery)');

    const invalidQtyRes = await makeRequest(
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
      { productId: prod1Doc._id.toString(), quantity: -2 }
    );

    const fakeId = new mongoose.Types.ObjectId();
    const fakeProdRes = await makeRequest(
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
      { productId: fakeId.toString(), quantity: 1 }
    );

    const exceedStockRes = await makeRequest(
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
      { productId: prod2Doc._id.toString(), quantity: 20 }
    );

    const unavailRes = await makeRequest(
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
      { productId: prodDisabled._id.toString(), quantity: 1 }
    );

    const cartValPass =
      invalidQtyRes.statusCode === 400 &&
      fakeProdRes.statusCode === 404 &&
      exceedStockRes.statusCode === 400 &&
      unavailRes.statusCode === 404;

    logResult('Cart Validation (Invalid Qty, Nonexistent, Overstock, Unavailable)', cartValPass, 'All rejected with correct 400/404 HTTP codes');

    const cartBRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cart',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    const custBDeleteAItemRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/cart/items/${prod1Doc._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    const cartAAfterCheck = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cart',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const isolationPass =
      cartBRes.statusCode === 200 &&
      cartBRes.body.data.items.length === 0 &&
      custBDeleteAItemRes.statusCode === 404 &&
      cartAAfterCheck.body.data.items.length === 2;

    logResult('Customer Cart Isolation', isolationPass, 'Customer B cannot see or delete items in Customer A cart');

    const customerDetailsPayload = {
      name: 'Alice ChocolateLover',
      email: customerAEmail,
      phone: '9876543210',
      address: '42 Marine Drive, Nariman Point',
      city: 'Mumbai',
      pincode: '400021'
    };

    const stockProd1Before = (await Product.findById(prod1Doc._id)).stock;
    const stockProd2Before = (await Product.findById(prod2Doc._id)).stock;

    const checkoutRes = await makeRequest(
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
      { customerDetails: customerDetailsPayload }
    );

    let createdOrder = null;
    let checkoutPass = false;

    if (checkoutRes.statusCode === 201 && checkoutRes.body?.data?._id) {
      createdOrder = checkoutRes.body.data;
      testOrderIds.push(createdOrder._id);

      const stockProd1After = (await Product.findById(prod1Doc._id)).stock;
      const stockProd2After = (await Product.findById(prod2Doc._id)).stock;

      const cartAfterOrder = await Cart.findOne({ user: custAReg.body.user._id });
      const cartCleared = cartAfterOrder && cartAfterOrder.items.length === 0;

      const stockDeductedCorrectly =
        stockProd1After === stockProd1Before - 2 &&
        stockProd2After === stockProd2Before - 2;

      const totalCorrect =
        createdOrder.subtotal === 1300 &&
        createdOrder.deliveryFee === 0 &&
        createdOrder.totalAmount === 1300 &&
        createdOrder.status === 'Pending' &&
        createdOrder.paymentStatus.includes('Unpaid');

      checkoutPass = stockDeductedCorrectly && cartCleared && totalCorrect;
    }

    logResult('Checkout, Stock Deduction & Cart Clearing', checkoutPass, `Order created (${createdOrder?.orderNumber}), stock deducted correctly (P1: ${stockProd1Before}->${stockProd1Before - 2}, P2: ${stockProd2Before}->${stockProd2Before - 2}), cart cleared`);

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
      { productId: prod2Doc._id.toString(), quantity: 2 }
    );

    await Product.updateOne({ _id: prod2Doc._id }, { stock: 1 });
    const stockBeforeFailedCheckout = (await Product.findById(prod2Doc._id)).stock;

    const failedCheckoutRes = await makeRequest(
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
      { customerDetails: customerDetailsPayload }
    );

    const stockAfterFailedCheckout = (await Product.findById(prod2Doc._id)).stock;
    const cartAfterFailedCheckout = await Cart.findOne({ user: custAReg.body.user._id });

    const rollbackPass =
      failedCheckoutRes.statusCode === 400 &&
      stockBeforeFailedCheckout === stockAfterFailedCheckout &&
      cartAfterFailedCheckout.items.length === 1;

    logResult('Failed Checkout Rollback & Consistency', rollbackPass, 'Failed checkout preserved stock without partial deduction and kept cart intact');

    await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cart',
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const originalOrderDoc = await Order.findById(createdOrder._id);
    const originalItem1 = originalOrderDoc.items.find((i) => i.product.toString() === prod1Doc._id.toString());

    await Product.updateOne(
      { _id: prod1Doc._id },
      { name: 'MUTATED PRODUCT NAME', price: 9999 }
    );

    const reloadedOrderDoc = await Order.findById(createdOrder._id);
    const reloadedItem1 = reloadedOrderDoc.items.find((i) => i.product.toString() === prod1Doc._id.toString());

    const snapshotPass =
      reloadedItem1.name === originalItem1.name &&
      reloadedItem1.unitPrice === originalItem1.unitPrice &&
      reloadedItem1.itemTotal === originalItem1.itemTotal &&
      reloadedOrderDoc.totalAmount === originalOrderDoc.totalAmount;

    logResult('Order Snapshot Immutability', snapshotPass, `Order preserves historical name "${reloadedItem1.name}" and price ₹${reloadedItem1.unitPrice} after catalog edit`);

    const myOrdersResA = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders/my-orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const myOrdersResB = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders/my-orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    const custBViewOrderARes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/${createdOrder._id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    const custAViewOrderARes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/${createdOrder._id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const orderIsolationPass =
      myOrdersResA.statusCode === 200 &&
      myOrdersResA.body.data.length >= 1 &&
      myOrdersResB.statusCode === 200 &&
      myOrdersResB.body.data.length === 0 &&
      custBViewOrderARes.statusCode === 404 &&
      custAViewOrderARes.statusCode === 200;

    logResult('Customer Order Isolation', orderIsolationPass, 'Customer A can view their orders; Customer B cannot view Customer A orders (HTTP 404)');

    const adminAllOrdersRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const custAllOrdersRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    const adminListPass =
      adminAllOrdersRes.statusCode === 200 &&
      adminAllOrdersRes.body.data.length >= 1 &&
      custAllOrdersRes.statusCode === 403;

    logResult('Admin Order Listing & Customer Protection', adminListPass, 'Admin can list all orders; customer is rejected with HTTP 403 Forbidden');

    const custStatusUpdateRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${createdOrder._id}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        }
      },
      { status: 'Confirmed' }
    );

    const invalidTransitionRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${createdOrder._id}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      { status: 'Delivered' }
    );

    const validTransitionRes1 = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${createdOrder._id}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      { status: 'Confirmed' }
    );

    const validTransitionRes2 = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${createdOrder._id}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      { status: 'Processing' }
    );

    const cancelRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${createdOrder._id}/status`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        }
      },
      { status: 'Cancelled' }
    );

    const stockAfterCancelP2 = (await Product.findById(prod2Doc._id)).stock;

    const statusPass =
      custStatusUpdateRes.statusCode === 403 &&
      invalidTransitionRes.statusCode === 400 &&
      validTransitionRes1.statusCode === 200 &&
      validTransitionRes2.statusCode === 200 &&
      cancelRes.statusCode === 200 &&
      cancelRes.body.data.status === 'Cancelled' &&
      stockAfterCancelP2 >= 2;

    logResult('Admin Status Transition Validation & Inventory Restock on Cancellation', statusPass, 'Customer forbidden (403), invalid jump rejected (400), Pending->Confirmed->Processing->Cancelled succeeded, stock restored');

    const emailServiceResult = await sendOrderConfirmationEmail(createdOrder);
    const emailHandlingPass =
      emailServiceResult.success === true ||
      (emailServiceResult.success === false && Boolean(emailServiceResult.skipped || emailServiceResult.reason || emailServiceResult.error));

    logResult('Email Confirmation Service & Graceful Degradation', emailHandlingPass, `Handled gracefully without crashing: ${JSON.stringify(emailServiceResult)}`);

    if (testOrderIds.length > 0) {
      const orderDelRes = await Order.deleteMany({ _id: { $in: testOrderIds } });
      logResult('Test Orders Cleanup', true, `Removed ${orderDelRes.deletedCount} temporary test order(s)`);
    }

    if (testProductIds.length > 0) {
      const prodDelRes = await Product.deleteMany({ _id: { $in: testProductIds } });
      logResult('Test Products Cleanup', true, `Removed ${prodDelRes.deletedCount} temporary test product(s)`);
    }

    if (testUserEmails.length > 0) {
      const users = await User.find({ email: { $in: testUserEmails } });
      const userIds = users.map((u) => u._id);
      await Cart.deleteMany({ user: { $in: userIds } });
      const userDelRes = await User.deleteMany({ email: { $in: testUserEmails } });
      logResult('Test Users and Carts Cleanup', true, `Removed ${userDelRes.deletedCount} temporary test user(s) and their carts`);
    }

    const adminCheck = await User.findOne({ email: adminEmail });
    const adminPreserved = adminCheck && adminCheck.role === 'admin';
    logResult('Existing Admin User Preservation', adminPreserved, `Admin user (${adminEmail}) preserved untouched`);

    console.log('\n========================================');
    console.log('CART & ORDER API VERIFICATION SUMMARY');
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
    console.error('Cart & Order test error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runCartAndOrderVerification();
