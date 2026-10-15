require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { execSync } = require('child_process');
const path = require('path');
const connectDB = require('../config/db');
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

const runLiveVerification = async () => {
  const results = [];
  const testEmailsToClean = [];

  const logResult = (testName, passed, details) => {
    results.push({ testName, passed, details });
    const tag = passed ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${testName}: ${details}`);
  };

  try {
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    if (healthRes.statusCode === 200 && healthRes.body && healthRes.body.status === 'healthy') {
      logResult('Health Endpoint Pre-check', true, 'GET /api/health returned 200 and status: healthy');
    } else {
      logResult('Health Endpoint Pre-check', false, `Returned ${healthRes.statusCode}: ${JSON.stringify(healthRes.body)}`);
    }

    const dbConnected = await connectDB();
    if (!dbConnected) {
      logResult('Database Connection', false, 'Unable to connect to MongoDB via Mongoose');
      return;
    }
    logResult('Database Connection', true, 'Connected to live MongoDB cluster successfully');

    const testEmail1 = `live_verify_${Date.now()}@cocora.test`;
    const testPassword1 = 'SecurePass_2026!';
    testEmailsToClean.push(testEmail1);

    const regRes1 = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Live Test Customer',
        email: testEmail1,
        password: testPassword1
      }
    );

    if (regRes1.statusCode === 201 && regRes1.body && regRes1.body.success === true && regRes1.body.token) {
      logResult('Customer Registration API', true, `HTTP 201 with JWT and safe user object returned for ${testEmail1}`);
    } else {
      logResult('Customer Registration API', false, `HTTP ${regRes1.statusCode}: ${JSON.stringify(regRes1.body)}`);
    }

    const savedUser1 = await User.findOne({ email: testEmail1 }).select('+password');
    if (savedUser1) {
      const isBcrypt = typeof savedUser1.password === 'string' && /^\$2[aby]\$\d{2}\$/.test(savedUser1.password);
      const plainNotStored = savedUser1.password !== testPassword1;
      const isCustomerRole = savedUser1.role === 'customer';

      if (isBcrypt && plainNotStored && isCustomerRole) {
        logResult('Saved User Document Inspection', true, `User saved with bcrypt hash (${savedUser1.password.substring(0, 10)}...), role: customer, plain password not stored`);
      } else {
        logResult('Saved User Document Inspection', false, `Document mismatch: isBcrypt=${isBcrypt}, plainNotStored=${plainNotStored}, role=${savedUser1.role}`);
      }
    } else {
      logResult('Saved User Document Inspection', false, 'User document not found in MongoDB');
    }

    const regResDuplicate = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Duplicate Attempt',
        email: testEmail1,
        password: testPassword1
      }
    );

    const duplicateCount = await User.countDocuments({ email: testEmail1 });
    if (regResDuplicate.statusCode === 409 && duplicateCount === 1) {
      logResult('Duplicate Email Rejection', true, `HTTP 409 Conflict returned; total documents in DB remains 1`);
    } else {
      logResult('Duplicate Email Rejection', false, `HTTP ${regResDuplicate.statusCode}, count=${duplicateCount}`);
    }

    const loginValidRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: testEmail1,
        password: testPassword1
      }
    );

    let customerToken = null;
    if (
      loginValidRes.statusCode === 200 &&
      loginValidRes.body &&
      loginValidRes.body.token &&
      loginValidRes.body.user &&
      loginValidRes.body.user.email === testEmail1 &&
      loginValidRes.body.user.password === undefined
    ) {
      customerToken = loginValidRes.body.token;
      logResult('Login with Valid Credentials', true, 'HTTP 200 with JWT token and safe user info without password');
    } else {
      logResult('Login with Valid Credentials', false, `HTTP ${loginValidRes.statusCode}: ${JSON.stringify(loginValidRes.body)}`);
    }

    const loginInvalidRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        email: testEmail1,
        password: 'IncorrectPassword999!'
      }
    );

    if (loginInvalidRes.statusCode === 401 && loginInvalidRes.body && loginInvalidRes.body.success === false) {
      logResult('Login with Incorrect Password', true, 'HTTP 401 Unauthorized returned with error message');
    } else {
      logResult('Login with Incorrect Password', false, `HTTP ${loginInvalidRes.statusCode}: ${JSON.stringify(loginInvalidRes.body)}`);
    }

    if (customerToken) {
      const meRes = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${customerToken}`
        }
      });

      if (
        meRes.statusCode === 200 &&
        meRes.body &&
        meRes.body.user &&
        meRes.body.user.email === testEmail1 &&
        meRes.body.user.password === undefined
      ) {
        logResult('GET /api/auth/me Authenticated Access', true, 'HTTP 200 returned authenticated user document without password/hash');
      } else {
        logResult('GET /api/auth/me Authenticated Access', false, `HTTP ${meRes.statusCode}: ${JSON.stringify(meRes.body)}`);
      }
    } else {
      logResult('GET /api/auth/me Authenticated Access', false, 'Skipped due to missing login token');
    }

    const meNoTokenRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET'
    });

    if (meNoTokenRes.statusCode === 401 && meNoTokenRes.body && meNoTokenRes.body.success === false) {
      logResult('GET /api/auth/me Without Token', true, 'HTTP 401 Unauthorized returned');
    } else {
      logResult('GET /api/auth/me Without Token', false, `HTTP ${meNoTokenRes.statusCode}`);
    }

    const meInvalidTokenRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid_signature_or_token_payload'
      }
    });

    if (meInvalidTokenRes.statusCode === 401 && meInvalidTokenRes.body && meInvalidTokenRes.body.success === false) {
      logResult('GET /api/auth/me With Invalid Token', true, 'HTTP 401 Unauthorized returned for malformed/invalid JWT');
    } else {
      logResult('GET /api/auth/me With Invalid Token', false, `HTTP ${meInvalidTokenRes.statusCode}`);
    }

    const testEmailEscalation = `live_escalate_${Date.now()}@cocora.test`;
    testEmailsToClean.push(testEmailEscalation);

    const regEscalationRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Escalation Attempter',
        email: testEmailEscalation,
        password: 'PasswordEscalate1!',
        role: 'admin'
      }
    );

    const escalationDbDoc = await User.findOne({ email: testEmailEscalation });
    const regReturnedCustomer = regEscalationRes.body && regEscalationRes.body.user && regEscalationRes.body.user.role === 'customer';
    const dbStoredCustomer = escalationDbDoc && escalationDbDoc.role === 'customer';

    if (regEscalationRes.statusCode === 201 && regReturnedCustomer && dbStoredCustomer) {
      logResult('Role Escalation Prevention on Public Registration', true, 'Registration with role: "admin" ignored payload role; saved in MongoDB as customer');
    } else {
      logResult('Role Escalation Prevention on Public Registration', false, `API role=${regEscalationRes.body?.user?.role}, DB role=${escalationDbDoc?.role}`);
    }

    const adminNameEnv = process.env.ADMIN_NAME;
    const adminEmailEnv = process.env.ADMIN_EMAIL;
    const adminPassEnv = process.env.ADMIN_PASSWORD;

    if (!adminNameEnv || !adminEmailEnv || !adminPassEnv) {
      logResult('Admin Provisioning Environment Variables', false, 'Missing ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD in environment');
    } else {
      logResult('Admin Provisioning Environment Variables', true, `Configured: email=${adminEmailEnv}, name=${adminNameEnv}`);

      const normalizedAdminEmail = adminEmailEnv.toLowerCase().trim();
      const existingAdminBefore = await User.findOne({ email: normalizedAdminEmail });

      const scriptPath = path.resolve(__dirname, '../scripts/createAdmin.js');
      const scriptOutput1 = execSync(`node "${scriptPath}"`, { encoding: 'utf-8' });

      const adminInDb = await User.findOne({ email: normalizedAdminEmail }).select('+password');
      const isRoleAdmin = adminInDb && adminInDb.role === 'admin';
      const isBcryptAdmin = adminInDb && /^\$2[aby]\$\d{2}\$/.test(adminInDb.password);
      const scriptReportedSuccessOrExists = scriptOutput1.includes('Admin account provisioned successfully') || scriptOutput1.includes('Admin account already exists');

      if (isRoleAdmin && isBcryptAdmin && scriptReportedSuccessOrExists) {
        logResult('Admin Provisioning Execution', true, `Script ran cleanly; admin user document confirmed in DB with role: admin and bcrypt hash (${scriptOutput1.trim()})`);
      } else {
        logResult('Admin Provisioning Execution', false, `Admin verify failed: role=${adminInDb?.role}, output=${scriptOutput1}`);
      }

      const scriptOutput2 = execSync(`node "${scriptPath}"`, { encoding: 'utf-8' });
      const adminInDbAfter = await User.findOne({ email: normalizedAdminEmail }).select('+password');
      const passwordUnchanged = adminInDb && adminInDbAfter && adminInDb.password === adminInDbAfter.password;

      if (scriptOutput2.includes('Admin account already exists') && passwordUnchanged) {
        logResult('Admin Script Idempotency & No Password Overwrite', true, 'Re-running script preserves existing admin and does not overwrite password');
      } else {
        logResult('Admin Script Idempotency & No Password Overwrite', false, `Second run output=${scriptOutput2.trim()}, passwordUnchanged=${passwordUnchanged}`);
      }

      if (!existingAdminBefore) {
        testEmailsToClean.push(normalizedAdminEmail);
      }
    }

    if (testEmailsToClean.length > 0) {
      const deleteResult = await User.deleteMany({ email: { $in: testEmailsToClean } });
      logResult('Test Data Cleanup', true, `Removed ${deleteResult.deletedCount} test user(s) (${testEmailsToClean.join(', ')}). Existing users untouched.`);
    } else {
      logResult('Test Data Cleanup', true, 'No test users to clean up.');
    }

    const finalHealthRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });

    if (finalHealthRes.statusCode === 200 && finalHealthRes.body && finalHealthRes.body.status === 'healthy') {
      logResult('Health Endpoint Post-check', true, 'GET /api/health returned 200 OK and healthy status');
    } else {
      logResult('Health Endpoint Post-check', false, `Returned ${finalHealthRes.statusCode}`);
    }

    console.log('\n========================================');
    console.log('LIVE DATABASE VERIFICATION SUMMARY');
    console.log('========================================');
    let allPassed = true;
    for (const r of results) {
      console.log(`${r.passed ? 'PASS' : 'FAIL'} | ${r.testName}: ${r.details}`);
      if (!r.passed) allPassed = false;
    }
    console.log('========================================');
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    console.log('========================================');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runLiveVerification();
