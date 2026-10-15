const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransporter({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
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

module.exports = {
  createTransporter,
  sendOrderConfirmationEmail
};
