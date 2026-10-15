require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { adminOnly } = require('../middleware/authMiddleware');

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

const runTests = async () => {
  console.log('--- STARTING AUTHENTICATION VERIFICATION SUITE ---');
  let passed = 0;
  let failed = 0;

  try {
    const health = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });

    if (health.statusCode === 200 && health.body.success === true) {
      console.log('PASS: GET /api/health returned 200 OK');
      passed++;
    } else {
      console.error('FAIL: GET /api/health failed', health);
      failed++;
    }

    const notFound = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/unknown-endpoint-xyz',
      method: 'GET'
    });

    if (notFound.statusCode === 404 && notFound.body.success === false) {
      console.log('PASS: Unknown route returned 404 Not Found');
      passed++;
    } else {
      console.error('FAIL: Unknown route 404 failed', notFound);
      failed++;
    }

    const regNoName = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: 'user@example.com', password: 'password123' }
    );

    if (regNoName.statusCode === 400 && regNoName.body.message === 'Name is required') {
      console.log('PASS: Registration rejects missing name with 400');
      passed++;
    } else {
      console.error('FAIL: Registration missing name check', regNoName);
      failed++;
    }

    const regNoEmail = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Aditya', password: 'password123' }
    );

    if (regNoEmail.statusCode === 400 && regNoEmail.body.message === 'Email is required') {
      console.log('PASS: Registration rejects missing email with 400');
      passed++;
    } else {
      console.error('FAIL: Registration missing email check', regNoEmail);
      failed++;
    }

    const regInvalidEmail = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Aditya', email: 'invalid-email', password: 'password123' }
    );

    if (regInvalidEmail.statusCode === 400 && regInvalidEmail.body.message === 'Please provide a valid email address') {
      console.log('PASS: Registration rejects invalid email format with 400');
      passed++;
    } else {
      console.error('FAIL: Registration invalid email format check', regInvalidEmail);
      failed++;
    }

    const regShortPass = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { name: 'Aditya', email: 'aditya@example.com', password: 'short' }
    );

    if (regShortPass.statusCode === 400 && regShortPass.body.message === 'Password must be at least 8 characters long') {
      console.log('PASS: Registration rejects short password (< 8 chars) with 400');
      passed++;
    } else {
      console.error('FAIL: Registration short password check', regShortPass);
      failed++;
    }

    const loginNoEmail = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { password: 'password123' }
    );

    if (loginNoEmail.statusCode === 400) {
      console.log('PASS: Login rejects missing email with 400');
      passed++;
    } else {
      console.error('FAIL: Login missing email check', loginNoEmail);
      failed++;
    }

    const loginNoPass = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: 'aditya@example.com' }
    );

    if (loginNoPass.statusCode === 400) {
      console.log('PASS: Login rejects missing password with 400');
      passed++;
    } else {
      console.error('FAIL: Login missing password check', loginNoPass);
      failed++;
    }

    const meNoToken = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET'
    });

    if (meNoToken.statusCode === 401 && meNoToken.body.message === 'Not authorized, no token provided') {
      console.log('PASS: GET /api/auth/me rejects request with no token (401)');
      passed++;
    } else {
      console.error('FAIL: GET /api/auth/me missing token check', meNoToken);
      failed++;
    }

    const meMalformedToken = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: 'Bearer thisisnotavalidjwttoken' }
    });

    if (meMalformedToken.statusCode === 401 && meMalformedToken.body.message === 'Not authorized, token invalid or expired') {
      console.log('PASS: GET /api/auth/me rejects malformed token with 401');
      passed++;
    } else {
      console.error('FAIL: GET /api/auth/me malformed token check', meMalformedToken);
      failed++;
    }

    const secret = process.env.JWT_SECRET;
    const expiredToken = jwt.sign({ id: '12345', role: 'customer' }, secret, { expiresIn: '1ms' });
    await new Promise((r) => setTimeout(r, 20));

    const meExpiredToken = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${expiredToken}` }
    });

    if (meExpiredToken.statusCode === 401 && meExpiredToken.body.message === 'Not authorized, token invalid or expired') {
      console.log('PASS: GET /api/auth/me rejects expired token with 401');
      passed++;
    } else {
      console.error('FAIL: GET /api/auth/me expired token check', meExpiredToken);
      failed++;
    }

    let customerResStatus = null;
    let customerResBody = null;
    const mockCustomerReq = { user: { role: 'customer', id: '123' } };
    const mockCustomerRes = {
      status: (code) => {
        customerResStatus = code;
        return {
          json: (body) => {
            customerResBody = body;
          }
        };
      }
    };
    adminOnly(mockCustomerReq, mockCustomerRes, () => {});

    if (customerResStatus === 403 && customerResBody && customerResBody.success === false) {
      console.log('PASS: adminOnly middleware rejects customer role with 403 Forbidden');
      passed++;
    } else {
      console.error('FAIL: adminOnly middleware customer rejection check', customerResStatus, customerResBody);
      failed++;
    }

    let adminNextCalled = false;
    const mockAdminReq = { user: { role: 'admin', id: '456' } };
    const mockAdminRes = {};
    adminOnly(mockAdminReq, mockAdminRes, () => {
      adminNextCalled = true;
    });

    if (adminNextCalled) {
      console.log('PASS: adminOnly middleware allows admin role');
      passed++;
    } else {
      console.error('FAIL: adminOnly middleware admin allow check');
      failed++;
    }

    console.log('--- SUITE RESULTS ---');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
  } catch (error) {
    console.error('Test suite error:', error);
  }
};

runTests();
