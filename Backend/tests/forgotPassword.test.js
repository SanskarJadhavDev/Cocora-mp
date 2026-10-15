require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const { sendPasswordResetOtpEmail } = require('../services/emailService');

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

const runForgotPasswordTests = async () => {
  console.log('--- STARTING COCORA FORGOT PASSWORD & OTP TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  const testEmailsToClean = [];

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
    const testEmail = `forgot_test_${timestamp}@cocora.test`;
    const originalPassword = 'OriginalPassword123!';
    const newPassword = 'NewSecretPassword456!';
    testEmailsToClean.push(testEmail);

    await User.create({
      name: 'Forgot Password Tester',
      email: testEmail,
      password: originalPassword,
      role: 'customer',
      isEmailVerified: true
    });

    const unknownEmailRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/forgot-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: `nonexistent_${timestamp}@cocora.test` }
    );

    assertTest(
      'Unknown email receives generic response (account enumeration prevented)',
      unknownEmailRes.statusCode === 200 &&
      unknownEmailRes.body?.success === true &&
      unknownEmailRes.body?.message?.includes('If an account exists'),
      `Status: ${unknownEmailRes.statusCode}, Message: ${unknownEmailRes.body?.message}`
    );

    assertTest(
      'Unknown email response does not leak OTP or sensitive fields',
      !unknownEmailRes.body?.otp && !unknownEmailRes.body?.resetToken && !unknownEmailRes.body?.hash,
      'No OTP/token in response'
    );

    const validForgotRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/forgot-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail }
    );

    assertTest(
      'Valid OTP request returns HTTP 200 generic message',
      validForgotRes.statusCode === 200 && validForgotRes.body?.success === true,
      `Status: ${validForgotRes.statusCode}`
    );

    assertTest(
      'Public API response never returns OTP or OTP hash',
      !validForgotRes.body?.otp && !validForgotRes.body?.resetOtp && !validForgotRes.body?.hash,
      'Response body keys: ' + Object.keys(validForgotRes.body || {}).join(', ')
    );

    const userWithOtp = await User.findOne({ email: testEmail }).select('+resetOtp +resetOtpExpires +resetOtpAttempts +resetOtpLastSentAt');

    assertTest(
      'OTP is stored as SHA-256 hash in database with 10-minute expiry',
      userWithOtp &&
      Boolean(userWithOtp.resetOtp) &&
      userWithOtp.resetOtp.length === 64 &&
      userWithOtp.resetOtpExpires > new Date(Date.now() + 8 * 60 * 1000) &&
      userWithOtp.resetOtpExpires <= new Date(Date.now() + 10 * 60 * 1000 + 5000),
      `Stored hash length: ${userWithOtp?.resetOtp?.length}, Expiry: ${userWithOtp?.resetOtpExpires}`
    );

    const cooldownRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/forgot-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail }
    );

    assertTest(
      'Resend cooldown enforced within 60 seconds (HTTP 429)',
      cooldownRes.statusCode === 429 && cooldownRes.body?.message?.includes('wait'),
      `Status: ${cooldownRes.statusCode}, Message: ${cooldownRes.body?.message}`
    );

    const testOtp = '742918';
    const testOtpHash = crypto.createHash('sha256').update(testOtp).digest('hex');
    userWithOtp.resetOtp = testOtpHash;
    userWithOtp.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    userWithOtp.resetOtpAttempts = 0;
    userWithOtp.resetOtpLastSentAt = new Date(Date.now() - 61 * 1000);
    await userWithOtp.save();

    const replaceForgotRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/forgot-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail }
    );

    const userAfterReplace = await User.findOne({ email: testEmail }).select('+resetOtp');
    assertTest(
      'Replacing an OTP invalidates previous OTP',
      replaceForgotRes.statusCode === 200 && userAfterReplace.resetOtp !== testOtpHash,
      'Old OTP hash replaced by fresh hash'
    );

    const activeOtp = '815239';
    const activeOtpHash = crypto.createHash('sha256').update(activeOtp).digest('hex');
    userAfterReplace.resetOtp = activeOtpHash;
    userAfterReplace.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    userAfterReplace.resetOtpAttempts = 0;
    await userAfterReplace.save();

    const badOtpRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-reset-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, otp: '000000' }
    );

    assertTest(
      'Incorrect OTP is rejected (HTTP 400 with attempts remaining)',
      badOtpRes.statusCode === 400 && badOtpRes.body?.message?.includes('attempt'),
      `Status: ${badOtpRes.statusCode}, Message: ${badOtpRes.body?.message}`
    );

    const expiredOtpEmail = `expired_test_${timestamp}@cocora.test`;
    testEmailsToClean.push(expiredOtpEmail);
    const expiredOtp = '654321';
    const expiredOtpHash = crypto.createHash('sha256').update(expiredOtp).digest('hex');
    await User.create({
      name: 'Expired OTP Tester',
      email: expiredOtpEmail,
      password: originalPassword,
      role: 'customer',
      isEmailVerified: true,
      resetOtp: expiredOtpHash,
      resetOtpExpires: new Date(Date.now() - 5000),
      resetOtpAttempts: 0
    });

    const expiredVerifyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-reset-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: expiredOtpEmail, otp: expiredOtp }
    );

    assertTest(
      'Expired OTP is rejected with HTTP 400',
      expiredVerifyRes.statusCode === 400 && expiredVerifyRes.body?.message?.toLowerCase().includes('expired'),
      `Status: ${expiredVerifyRes.statusCode}, Message: ${expiredVerifyRes.body?.message}`
    );

    const limitEmail = `limit_test_${timestamp}@cocora.test`;
    testEmailsToClean.push(limitEmail);
    const limitOtp = '345678';
    const limitOtpHash = crypto.createHash('sha256').update(limitOtp).digest('hex');
    await User.create({
      name: 'Limit OTP Tester',
      email: limitEmail,
      password: originalPassword,
      role: 'customer',
      isEmailVerified: true,
      resetOtp: limitOtpHash,
      resetOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
      resetOtpAttempts: 4
    });

    const fifthFailRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-reset-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: limitEmail, otp: '111111' }
    );

    assertTest(
      'Attempt limit is enforced: 5th failure invalidates OTP (HTTP 429)',
      fifthFailRes.statusCode === 429 && fifthFailRes.body?.message?.toLowerCase().includes('too many'),
      `Status: ${fifthFailRes.statusCode}, Message: ${fifthFailRes.body?.message}`
    );

    const limitUserAfter = await User.findOne({ email: limitEmail }).select('+resetOtp');
    assertTest(
      'OTP cleared from database after reaching max attempts',
      !limitUserAfter.resetOtp,
      'resetOtp is undefined'
    );

    const correctVerifyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/verify-reset-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, otp: activeOtp }
    );

    const resetToken = correctVerifyRes.body?.resetToken;
    assertTest(
      'Correct OTP verifies successfully and returns single-use reset authorization token',
      correctVerifyRes.statusCode === 200 && Boolean(resetToken) && typeof resetToken === 'string',
      `Status: ${correctVerifyRes.statusCode}, Token length: ${resetToken?.length || 0}`
    );

    const userAfterOtpVerify = await User.findOne({ email: testEmail }).select('+resetOtp +resetPasswordToken +resetPasswordTokenExpires');
    assertTest(
      'OTP is invalidated from database upon successful verification',
      !userAfterOtpVerify.resetOtp,
      'user.resetOtp cleared'
    );

    assertTest(
      'Reset authorization token is stored as SHA-256 hash in database',
      Boolean(userAfterOtpVerify.resetPasswordToken) &&
      userAfterOtpVerify.resetPasswordToken === crypto.createHash('sha256').update(resetToken).digest('hex'),
      'Token hash matches SHA-256 of resetToken'
    );

    const shortPwdRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/reset-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, resetToken, newPassword: 'short' }
    );

    assertTest(
      'Password under 8 characters is rejected (HTTP 400)',
      shortPwdRes.statusCode === 400 && shortPwdRes.body?.message?.includes('8 characters'),
      `Status: ${shortPwdRes.statusCode}, Message: ${shortPwdRes.body?.message}`
    );

    const badTokenRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/reset-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, resetToken: 'forged_or_invalid_token', newPassword: 'ValidNewPassword123!' }
    );

    assertTest(
      'Password reset without valid OTP resetToken is rejected (HTTP 400)',
      badTokenRes.statusCode === 400,
      `Status: ${badTokenRes.statusCode}, Message: ${badTokenRes.body?.message}`
    );

    const validResetRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/reset-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, resetToken, newPassword }
    );

    assertTest(
      'Valid reset updates password successfully (HTTP 200)',
      validResetRes.statusCode === 200 && validResetRes.body?.success === true,
      `Status: ${validResetRes.statusCode}, Message: ${validResetRes.body?.message}`
    );

    const userAfterReset = await User.findOne({ email: testEmail }).select('+password +resetPasswordToken +role +isEmailVerified');
    const isNewPasswordBcrypt = await bcrypt.compare(newPassword, userAfterReset.password);
    const isOldPasswordMatching = await bcrypt.compare(originalPassword, userAfterReset.password);

    assertTest(
      'Database password is updated with new bcrypt hash',
      isNewPasswordBcrypt && !isOldPasswordMatching,
      'bcrypt matches new password and rejects original password'
    );

    assertTest(
      'User role and verification status preserved after password reset',
      userAfterReset.role === 'customer' && userAfterReset.isEmailVerified === true,
      `Role: ${userAfterReset.role}, isEmailVerified: ${userAfterReset.isEmailVerified}`
    );

    assertTest(
      'Reset credentials invalidated after successful password reset',
      !userAfterReset.resetPasswordToken,
      'resetPasswordToken cleared'
    );

    const oldLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, password: originalPassword }
    );

    assertTest(
      'Old password no longer works (HTTP 401)',
      oldLoginRes.statusCode === 401,
      `Status: ${oldLoginRes.statusCode}`
    );

    const newLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, password: newPassword }
    );

    assertTest(
      'New password logs in successfully (HTTP 200 with JWT token)',
      newLoginRes.statusCode === 200 && Boolean(newLoginRes.body?.token),
      `Status: ${newLoginRes.statusCode}, User: ${newLoginRes.body?.user?.name}`
    );

    const reusedTokenRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/reset-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: testEmail, resetToken, newPassword: 'AnotherPassword789!' }
    );

    assertTest(
      'Reset authorization token cannot be reused (HTTP 400)',
      reusedTokenRes.statusCode === 400,
      `Status: ${reusedTokenRes.statusCode}, Message: ${reusedTokenRes.body?.message}`
    );

    const realEmailResult = await sendPasswordResetOtpEmail(
      { name: 'Tester', email: 'test@example.com' },
      '123456'
    );
    assertTest(
      'Configured email service (real SMTP delivery attempt)',
      realEmailResult !== undefined && typeof realEmailResult === 'object',
      `Result: ${JSON.stringify(realEmailResult)}`
    );

    const mockFailureResult = await (async () => {
      const originalHost = process.env.SMTP_HOST;
      try {
        process.env.SMTP_HOST = '';
        return await sendPasswordResetOtpEmail({ name: 'Fail User', email: 'fail@example.com' }, '999999');
      } finally {
        process.env.SMTP_HOST = originalHost;
      }
    })();

    assertTest(
      'Email delivery failure handled safely without crashing (returns success: false)',
      mockFailureResult && mockFailureResult.success === false && Boolean(mockFailureResult.error),
      `Error returned safely: ${mockFailureResult?.error}`
    );

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    for (const email of testEmailsToClean) {
      try {
        await User.deleteMany({ email });
      } catch {}
    }
    await mongoose.connection.close();
  }

  console.log('\n========================================');
  console.log(`FORGOT PASSWORD TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runForgotPasswordTests();
