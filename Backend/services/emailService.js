const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
};

const sendVerificationEmail = async (user, rawToken) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.error('Verification email error: SMTP configuration missing');
      return {
        success: false,
        error: 'SMTP configuration missing'
      };
    }

    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const verificationUrl = `${clientUrl}/verify-email?token=${rawToken}`;
    const fromAddress = process.env.SMTP_FROM || 'Cocora Chocolates <orders@cocora.in>';

    const mailOptions = {
      from: fromAddress,
      to: user.email,
      subject: 'Verify your Cocora account',
      text: `Hello ${user.name},\n\nThank you for creating an account with Cocora!\n\nPlease verify your email address by opening the following link:\n${verificationUrl}\n\nThis verification link is valid for 24 hours.\n\nWarm regards,\nCocora Chocolatiers`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
          <h2 style="color: #2D0826;">Welcome to Cocora, ${user.name}!</h2>
          <p>Thank you for creating an account with Cocora Artisanal Chocolates.</p>
          <p>Please confirm your email address to activate your account and start ordering:</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${verificationUrl}" style="background-color: #D4AF37; color: #1A0F2E; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 0.9rem; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 0.85rem; word-break: break-all; color: #555;">${verificationUrl}</p>
          <p style="font-size: 0.85rem; color: #888; margin-top: 24px;">This verification link will expire in 24 hours.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 0.8rem; color: #999;">If you did not register for an account, please disregard this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Verification email error: Failed to send verification email -', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

const sendOrderConfirmationEmail = async (order) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('Order email notice: SMTP environment variables are not configured. Confirmation email skipped.');
      return {
        success: false,
        skipped: true,
        reason: 'SMTP configuration missing'
      };
    }

    const fromAddress = process.env.SMTP_FROM || 'Cocora Chocolates <orders@cocora.in>';
    const customer = order.customerDetails;

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.unitPrice}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.itemTotal}</td>
        </tr>
      `
      )
      .join('');

    const itemsText = order.items
      .map((item) => `- ${item.name} x ${item.quantity} @ ₹${item.unitPrice} = ₹${item.itemTotal}`)
      .join('\n');

    const mailOptions = {
      from: fromAddress,
      to: customer.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      text: `Hello ${customer.name},

Thank you for your order with Cocora!

Order Number: ${order.orderNumber}
Payment Status: ${order.paymentStatus}

Purchased Items:
${itemsText}

Subtotal: ₹${order.subtotal}
Delivery Fee: ₹${order.deliveryFee}
Total Amount: ₹${order.totalAmount}

Delivery Address:
${customer.address}, ${customer.city} - ${customer.pincode}
Phone: ${customer.phone}

We are preparing your artisanal chocolates with care.

Warm regards,
Cocora Chocolatiers`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
          <h2 style="color: #2D0826;">Thank you for your order, ${customer.name}!</h2>
          <p>We have received your order <strong>${order.orderNumber}</strong>.</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="background-color: #f8f8f8;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 16px; text-align: right;">
            <p style="margin: 4px 0;">Subtotal: ₹${order.subtotal}</p>
            <p style="margin: 4px 0;">Delivery Fee: ₹${order.deliveryFee}</p>
            <h3 style="margin: 8px 0; color: #2D0826;">Total Amount: ₹${order.totalAmount}</h3>
          </div>

          <div style="margin-top: 24px; padding: 12px; background-color: #fbf8f5; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0;">Delivery Information:</h4>
            <p style="margin: 2px 0;">${customer.name}</p>
            <p style="margin: 2px 0;">${customer.address}</p>
            <p style="margin: 2px 0;">${customer.city} - ${customer.pincode}</p>
            <p style="margin: 2px 0;">Phone: ${customer.phone}</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Order email error: Failed to send confirmation email -', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

const sendPasswordResetOtpEmail = async (user, otp) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.error('Password reset email error: SMTP configuration missing');
      return {
        success: false,
        error: 'SMTP configuration missing'
      };
    }

    const fromAddress = process.env.SMTP_FROM || 'Cocora Chocolates <orders@cocora.in>';

    const mailOptions = {
      from: fromAddress,
      to: user.email,
      subject: 'Your Cocora Password Reset Code',
      text: `Hello ${user.name},\n\nWe received a request to reset your password for your Cocora account.\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request a password reset, please ignore this email or contact support.\n\nWarm regards,\nCocora Chocolatiers`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
          <h2 style="color: #2D0826;">Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password for your Cocora account. Use the verification code below to proceed:</p>
          <div style="margin: 28px 0; text-align: center;">
            <div style="display: inline-block; background-color: #1A0F2E; color: #D4AF37; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 36px; border-radius: 8px; border: 1px solid #D4AF37;">
              ${otp}
            </div>
          </div>
          <p style="font-size: 0.9rem; color: #666; text-align: center;">This code will expire in <strong>10 minutes</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 0.8rem; color: #999;">If you did not request a password reset, please disregard this email. Your password will remain unchanged.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Password reset email error: Failed to send OTP email -', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createTransporter,
  sendVerificationEmail,
  sendOrderConfirmationEmail,
  sendPasswordResetOtpEmail
};
