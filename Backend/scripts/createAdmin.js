require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const provisionAdmin = async () => {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error('Error: ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be configured in environment variables');
    process.exit(1);
  }

  const isConnected = await connectDB();
  if (!isConnected) {
    console.error('Error: Database connection required to provision admin account');
    process.exit(1);
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log('Admin account already exists with this email. Password was not modified.');
      } else {
        console.error('An existing user with this email has the customer role. Not promoting customer to admin.');
      }
      await mongoose.disconnect();
      process.exit(0);
    }

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      role: 'admin'
    });

    console.log('Admin account provisioned successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error provisioning admin account:', error.message || 'Operation failed');
    await mongoose.disconnect();
    process.exit(1);
  }
};

provisionAdmin();
