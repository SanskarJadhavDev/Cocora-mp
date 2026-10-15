require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const crypto = require('crypto');
const connectDB = require('../config/db');
const User = require('../models/User');
const { Product } = require('../models/Product');
const Cart = require('../models/Cart');
const { Order } = require('../models/Order');

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

const runAllTests = async () => {
  console.log('--- STARTING COCORA 3 CRITICAL ISSUES VERIFICATION SUITE ---');
  let passed = 0;
  let failed = 0;

  const testEmailsToClean = [];
  const testProductIds = [];
  const testOrderIds = [];

  const assertTest = (name, condition, detail = '') => {
    if (condition) {
      console.log(`[PASS] ${name}${detail ? ': ' + detail : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}${detail ? ': ' + detail : ''}`);
      failed++;
    }
  };

  try {
    await connectDB();

    const timestamp = Date.now();
    const testCustomerEmail = `issue_cust_${timestamp}@cocora.test`;
    const testCustomerPassword = 'SecurePassword123!';
    testEmailsToClean.push(testCustomerEmail);

    const regRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Verification Test User',
        email: testCustomerEmail,
        password: testCustomerPassword,
        role: 'admin'
      }
    );

    const regNoToken = regRes.statusCode === 201 && !regRes.body?.token;
    assertTest('Registration does not issue token', regNoToken, 'HTTP 201 returned with message and no token');

    const createdUser = await User.findOne({ email: testCustomerEmail }).select('+verificationToken +verificationTokenExpires');
    const isUnverified = createdUser && createdUser.isEmailVerified === false;
    const isCustomerRole = createdUser && createdUser.role === 'customer';
    const hasHashedToken = createdUser && Boolean(createdUser.verificationToken);
    const hasExpiration = createdUser && createdUser.verificationTokenExpires > new Date();

    assertTest('Customer account created unverified', isUnverified, 'isEmailVerified is false by default');
    assertTest('Public registration cannot assign admin role', isCustomerRole, 'role is strictly customer despite payload specifying admin');
    assertTest('Verification token stored as hash with expiration', hasHashedToken && hasExpiration, 'Stored token length: ' + (createdUser?.verificationToken?.length || 0));

    const unverifiedLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: testCustomerEmail,
        password: testCustomerPassword
      }
    );

    const loginBlocked = unverifiedLoginRes.statusCode === 403 && unverifiedLoginRes.body?.message?.toLowerCase().includes('verification');
    assertTest('Unverified login blocked', loginBlocked, 'HTTP 403 Forbidden with clear verification required message');

    const invalidTokenRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-email',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { token: 'nonexistent-or-invalid-token' }
    );
    assertTest('Invalid verification token rejected', invalidTokenRes.statusCode === 400, 'HTTP 400 returned for invalid token');

    const expiredTokenUserEmail = `issue_expired_${timestamp}@cocora.test`;
    testEmailsToClean.push(expiredTokenUserEmail);
    const expiredRaw = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRaw).digest('hex');

    await User.create({
      name: 'Expired Token User',
      email: expiredTokenUserEmail,
      password: 'ExpiredPassword123!',
      role: 'customer',
      isEmailVerified: false,
      verificationToken: expiredHash,
      verificationTokenExpires: new Date(Date.now() - 3600000),
      verificationLastSentAt: new Date(Date.now() - 3600000)
    });

    const expiredTokenRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-email',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { token: expiredRaw }
    );
    assertTest('Expired verification token rejected', expiredTokenRes.statusCode === 400, 'HTTP 400 returned for expired token');

    const rawTestToken = crypto.randomBytes(32).toString('hex');
    const validTestHash = crypto.createHash('sha256').update(rawTestToken).digest('hex');
    await User.updateOne(
      { email: testCustomerEmail },
      { verificationToken: validTestHash, verificationTokenExpires: new Date(Date.now() + 86400000) }
    );

    const verifySuccessRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-email',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { token: rawTestToken }
    );

    const userAfterVerification = await User.findOne({ email: testCustomerEmail }).select('+verificationToken');
    const verifySuccess = verifySuccessRes.statusCode === 200 && userAfterVerification.isEmailVerified === true && !userAfterVerification.verificationToken;
    assertTest('Valid token successfully verifies account and invalidates token', verifySuccess, 'User is marked verified and token cleared');

    const reuseTokenRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-email',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { token: rawTestToken }
    );
    assertTest('Reused token rejected', reuseTokenRes.statusCode === 400, 'HTTP 400 returned on second use');

    const verifiedLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: testCustomerEmail,
        password: testCustomerPassword
      }
    );

    const verifiedLoginSuccess = verifiedLoginRes.statusCode === 200 && Boolean(verifiedLoginRes.body?.token);
    const customerToken = verifiedLoginRes.body?.token;
    assertTest('Verified customer login succeeds', verifiedLoginSuccess, 'HTTP 200 with JWT token');

    const alreadyVerifiedResend = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/resend-verification',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testCustomerEmail }
    );
    assertTest('Resend verification rejected for already verified user', alreadyVerifiedResend.statusCode === 400, 'HTTP 400 returned');

    const cooldownEmail = `issue_cooldown_${timestamp}@cocora.test`;
    testEmailsToClean.push(cooldownEmail);
    await User.create({
      name: 'Cooldown Test User',
      email: cooldownEmail,
      password: 'CooldownPassword123!',
      role: 'customer',
      isEmailVerified: false,
      verificationToken: 'dummyhash',
      verificationTokenExpires: new Date(Date.now() + 86400000),
      verificationLastSentAt: new Date()
    });

    const cooldownRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/resend-verification',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: cooldownEmail }
    );
    assertTest('Resend verification respects cooldown rate limit', cooldownRes.statusCode === 429, 'HTTP 429 returned when requested within 60s');

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
    const adminLoginSuccess = adminLoginRes.statusCode === 200 && adminLoginRes.body?.user?.role === 'admin';
    assertTest('Existing administrator login and authorization preserved', adminLoginSuccess, 'Admin logged in with role admin');

    const testProduct1 = await Product.create({
      name: `Test Truffle Alpha ${timestamp}`,
      description: 'Single origin test chocolate.',
      price: 250,
      category: 'Dark Chocolate',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 50,
      isAvailable: true
    });
    testProductIds.push(testProduct1._id.toString());

    const testProduct2 = await Product.create({
      name: `Test Truffle Beta ${timestamp}`,
      description: 'Gourmet test chocolate.',
      price: 300,
      category: 'Milk Chocolate',
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b',
      stock: 50,
      isAvailable: true
    });
    testProductIds.push(testProduct2._id.toString());

    await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/cart',
        method: 'DELETE',
        headers: { Authorization: `Bearer ${customerToken}` }
      }
    );

    const emptyCartRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cart',
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assertTest('Empty cart returns totalItems: 0', emptyCartRes.body?.data?.totalItems === 0, 'Cart count is 0');

    const add1Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/cart/items',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`
        }
      },
      { productId: testProduct1._id.toString(), quantity: 1 }
    );
    assertTest('One product with quantity 1 gives totalItems 1 (Cart 1)', add1Res.body?.data?.totalItems === 1, 'totalItems: 1');

    const update3Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/cart/items/${testProduct1._id.toString()}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`
        }
      },
      { quantity: 3 }
    );
    assertTest('One product with quantity 3 gives totalItems 3 (Cart 3)', update3Res.body?.data?.totalItems === 3, 'totalItems: 3');

    await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/cart/items/${testProduct1._id.toString()}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`
        }
      },
      { quantity: 2 }
    );

    const add2Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/cart/items',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`
        }
      },
      { productId: testProduct2._id.toString(), quantity: 3 }
    );
    assertTest('Two products with quantities 2 and 3 give totalItems 5 (Cart 5)', add2Res.body?.data?.totalItems === 5, 'Sum of quantities (2 + 3) = 5');

    const getCartRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cart',
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assertTest('GET /api/cart persists correct totalItems 5', getCartRes.body?.data?.totalItems === 5, 'Server cart totalItems: 5');

    const removeRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/cart/items/${testProduct2._id.toString()}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assertTest('Removing product updates counter back to 2', removeRes.body?.data?.totalItems === 2, 'Counter decreased accurately to 2');

    const missingNameCheckout = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/orders/checkout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`
        }
      },
      {
        customerDetails: {
          name: '',
          email: testCustomerEmail,
          phone: '9876543210',
          address: 'Perry Cross Road',
          city: 'Mumbai',
          pincode: '400050'
        }
      }
    );
    assertTest('Empty name in checkout is rejected with "Full name is required"', missingNameCheckout.statusCode === 400 && missingNameCheckout.body?.message === 'Full name is required', 'HTTP 400 returned');

    const populatedCheckout = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/orders/checkout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`
        }
      },
      {
        customerDetails: {
          name: 'Aditya Sharma',
          email: testCustomerEmail,
          phone: '9876543210',
          address: 'Flat 402, Sea Green Apts, Perry Cross Rd',
          city: 'Mumbai',
          pincode: '400050'
        },
        paymentMethod: 'COD'
      }
    );

    const checkoutSuccess = populatedCheckout.statusCode === 201 && Boolean(populatedCheckout.body?.data?._id);
    if (populatedCheckout.body?.data?._id) {
      testOrderIds.push(populatedCheckout.body.data._id);
    }
    assertTest('Populated valid name passes checkout and creates order', checkoutSuccess, 'Order: ' + (populatedCheckout.body?.data?.orderNumber || 'none'));

    const postCheckoutCart = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cart',
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assertTest('Successful checkout resets backend cart to totalItems 0', postCheckoutCart.body?.data?.totalItems === 0, 'Cart counter reset to 0');

    const customer2Email = `issue_cust2_${timestamp}@cocora.test`;
    testEmailsToClean.push(customer2Email);
    const cust2Doc = await User.create({
      name: 'Customer Two',
      email: customer2Email,
      password: 'PasswordTwo123!',
      role: 'customer',
      isEmailVerified: true
    });
    const login2Res = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: customer2Email, password: 'PasswordTwo123!' }
    );
    const token2 = login2Res.body?.token;

    const cust2CartRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cart',
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` }
    });
    assertTest('Customer session isolation: Customer Two sees empty cart', cust2CartRes.body?.data?.totalItems === 0, 'No leaking between customer accounts');

    for (const email of testEmailsToClean) {
      const u = await User.findOne({ email });
      if (u) {
        await Cart.deleteMany({ user: u._id });
        await User.deleteOne({ _id: u._id });
      }
    }
    for (const pid of testProductIds) {
      await Product.deleteOne({ _id: pid });
    }
    for (const oid of testOrderIds) {
      await Order.deleteOne({ _id: oid });
    }

    console.log('\n========================================');
    console.log(`CRITICAL ISSUES VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================');
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test suite error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runAllTests();
