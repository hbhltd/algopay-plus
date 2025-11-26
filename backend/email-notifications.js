const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { Resend } = require('resend');

// Configure email provider
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // 'resend', 'sendgrid', or 'smtp'
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@supportly.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initialize providers
let resend, smtpTransporter;

if (EMAIL_PROVIDER === 'resend') {
  resend = new Resend(process.env.RESEND_API_KEY);
} else if (EMAIL_PROVIDER === 'sendgrid') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else if (EMAIL_PROVIDER === 'smtp') {
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// =====================================================
// EMAIL TEMPLATES
// =====================================================

const templates = {
  welcome: (displayName, username) => ({
    subject: `Welcome to Supportly, ${displayName}! 🎉`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #667eea; margin-top: 0; }
    .button { display: inline-block; padding: 14px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .link-box { background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .link-box code { font-size: 16px; color: #667eea; word-break: break-all; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center; font-size: 14px; color: #666; }
    .checklist { list-style: none; padding: 0; }
    .checklist li { padding: 10px 0; padding-left: 30px; position: relative; }
    .checklist li:before { content: '✅'; position: absolute; left: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💜 Welcome to Supportly!</h1>
    </div>

    <div class="content">
      <h2>Hi ${displayName}! 🎉</h2>

      <p>Your creator page is now live! You can start accepting donations in crypto and credit cards with <strong>zero platform fees</strong>.</p>

      <div class="link-box">
        <strong>Your page link:</strong><br>
        <code>${FRONTEND_URL}/@${username}</code>
      </div>

      <a href="${FRONTEND_URL}/dashboard" class="button">Go to Dashboard →</a>

      <h3>Next Steps:</h3>
      <ul class="checklist">
        <li>Share your page link on social media</li>
        <li>Set up NFT reward tiers for supporters</li>
        <li>Customize your profile and bio</li>
        <li>Receive your first donation! 🎊</li>
      </ul>

      <p><strong>Pro Tips:</strong></p>
      <ul>
        <li>💎 Crypto donations have 0% platform fees</li>
        <li>🎨 NFT rewards automatically mint for big supporters</li>
        <li>📊 Analytics dashboard shows all your stats</li>
        <li>⚡ USDC payments settle instantly on Algorand</li>
      </ul>

      <p>Need help? Reply to this email anytime!</p>

      <p style="margin-top: 30px;">
        Best,<br>
        <strong>The Supportly Team</strong>
      </p>
    </div>

    <div class="footer">
      <p>💜 Supportly - Support Creators, Zero Fees</p>
      <p><a href="${FRONTEND_URL}" style="color: #667eea;">Visit Supportly</a></p>
    </div>
  </div>
</body>
</html>
    `
  }),

  donationNotification: (creatorName, amount, donorName, message) => ({
    subject: `🎉 You received a $${amount} donation!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 48px; }
    .header p { margin: 10px 0 0; font-size: 20px; opacity: 0.95; }
    .content { padding: 40px 30px; }
    .amount-box { background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .amount-box h2 { margin: 0 0 10px; color: #667eea; font-size: 32px; }
    .message-box { background: #fffbf0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .button { display: inline-block; padding: 14px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉</h1>
      <p>New Donation Received!</p>
    </div>

    <div class="content">
      <h2>Great news, ${creatorName}!</h2>

      <div class="amount-box">
        <h2>$${amount}</h2>
        <p>from <strong>${donorName}</strong></p>
      </div>

      ${message ? `
      <div class="message-box">
        <strong>💬 Message:</strong><br>
        "${message}"
      </div>
      ` : ''}

      <p>Your supporter has been sent a receipt automatically. ${parseFloat(amount) >= 50 ? 'They may also be eligible for an NFT reward if you have tiers configured! 🎨' : ''}</p>

      <a href="${FRONTEND_URL}/dashboard" class="button">View Dashboard →</a>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Keep creating amazing content! Your supporters love what you do. 💜
      </p>
    </div>

    <div class="footer">
      <p>💜 Supportly - Support Creators, Zero Fees</p>
      <p><a href="${FRONTEND_URL}/dashboard" style="color: #667eea;">Go to Dashboard</a></p>
    </div>
  </div>
</body>
</html>
    `
  }),

  donationReceipt: (donorName, creatorName, amount, txHash) => ({
    subject: `Thank you for supporting ${creatorName}! 💜`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .receipt-box { border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
    .receipt-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; }
    .tx-hash { background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px; word-break: break-all; margin: 10px 0; font-family: monospace; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💜 Thank You!</h1>
    </div>

    <div class="content">
      <h2>Hi ${donorName}! 🎉</h2>

      <p>Thank you for supporting <strong>${creatorName}</strong>! Your contribution helps them create amazing content.</p>

      <div class="receipt-box">
        <h3 style="margin-top: 0;">Donation Receipt</h3>
        <div class="receipt-row">
          <span>To:</span>
          <span><strong>${creatorName}</strong></span>
        </div>
        <div class="receipt-row">
          <span>Amount:</span>
          <span><strong>$${amount} USD</strong></span>
        </div>
        <div class="receipt-row">
          <span>Date:</span>
          <span>${new Date().toLocaleDateString()}</span>
        </div>
        <div class="receipt-row">
          <span>Status:</span>
          <span style="color: #28a745;">✓ Completed</span>
        </div>
      </div>

      ${txHash ? `
      <p style="font-size: 14px; color: #666;">
        <strong>Transaction ID:</strong>
      </p>
      <div class="tx-hash">${txHash}</div>
      ` : ''}

      <p style="margin-top: 30px;">
        Your support means the world to creators. Keep being awesome! 🌟
      </p>

      <p style="font-size: 12px; color: #999; margin-top: 30px;">
        This email serves as your receipt for tax purposes. Transaction ID above can be used for verification.
      </p>
    </div>

    <div class="footer">
      <p>💜 Supportly - Support Creators, Zero Fees</p>
      <p><a href="${FRONTEND_URL}" style="color: #667eea;">Visit Supportly</a></p>
    </div>
  </div>
</body>
</html>
    `
  }),

  weeklyReport: (creatorName, totalRevenue, donationCount, supporterCount) => ({
    subject: `📊 Your Weekly Report - $${totalRevenue.toFixed(2)} earned!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 30px 0; }
    .stat-card { text-align: center; padding: 20px; background: #f8f9ff; border-radius: 8px; }
    .stat-card h3 { margin: 0; font-size: 32px; color: #667eea; }
    .stat-card p { margin: 10px 0 0; font-size: 14px; color: #666; }
    .button { display: inline-block; padding: 14px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your Weekly Report</h1>
      <p>${new Date().toLocaleDateString()}</p>
    </div>

    <div class="content">
      <h2>Hi ${creatorName}! 👋</h2>

      <p>Here's your weekly summary:</p>

      <div class="stats-grid">
        <div class="stat-card">
          <h3>$${totalRevenue.toFixed(2)}</h3>
          <p>Revenue</p>
        </div>
        <div class="stat-card">
          <h3>${donationCount}</h3>
          <p>Donations</p>
        </div>
        <div class="stat-card">
          <h3>${supporterCount}</h3>
          <p>Supporters</p>
        </div>
      </div>

      <p>
        ${totalRevenue > 0 ? '🎉 Great week! Your supporters are loving your content.' : 'Keep creating! Share your page to get more support.'}
      </p>

      <a href="${FRONTEND_URL}/dashboard" class="button">View Full Analytics →</a>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        <strong>💡 Tip:</strong> ${
          totalRevenue > 100
            ? 'Consider creating exclusive NFT rewards for your top supporters!'
            : 'Share your page on social media to reach more supporters.'
        }
      </p>
    </div>

    <div class="footer">
      <p>💜 Supportly - Weekly Reports Every Monday</p>
      <p><a href="${FRONTEND_URL}/dashboard" style="color: #667eea;">Manage Email Preferences</a></p>
    </div>
  </div>
</body>
</html>
    `
  }),

  test: (email) => ({
    subject: '✅ Test Email from Supportly',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 40px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    h1 { color: #667eea; margin-top: 0; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Email System Working!</h1>

    <div class="success">
      <strong>Success!</strong> Your email system is configured correctly.
    </div>

    <p>This test email confirms that:</p>
    <ul>
      <li>✅ Email provider is connected</li>
      <li>✅ Templates are rendering correctly</li>
      <li>✅ Emails are being delivered</li>
    </ul>

    <p><strong>Test Details:</strong></p>
    <ul>
      <li>To: ${email}</li>
      <li>Provider: ${EMAIL_PROVIDER}</li>
      <li>Time: ${new Date().toISOString()}</li>
    </ul>

    <p>You're all set! 🎉</p>
  </div>
</body>
</html>
    `
  })
};

// =====================================================
// SEND EMAIL FUNCTION
// =====================================================

async function sendEmail(to, subject, html) {
  try {
    if (EMAIL_PROVIDER === 'resend') {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html
      });
      if (error) throw error;
      console.log(`✅ Email sent via Resend to ${to}`);
      return data;

    } else if (EMAIL_PROVIDER === 'sendgrid') {
      const msg = {
        to,
        from: FROM_EMAIL,
        subject,
        html
      };
      await sgMail.send(msg);
      console.log(`✅ Email sent via SendGrid to ${to}`);

    } else if (EMAIL_PROVIDER === 'smtp') {
      const info = await smtpTransporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        html
      });
      console.log(`✅ Email sent via SMTP to ${to}`);
      return info;

    } else {
      console.log(`📧 [DEV MODE] Email would be sent to ${to}: ${subject}`);
    }
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

// =====================================================
// TEMPLATE FUNCTIONS
// =====================================================

async function sendWelcomeEmail(email, displayName, username) {
  const { subject, html } = templates.welcome(displayName, username);
  return sendEmail(email, subject, html);
}

async function sendDonationNotification(email, creatorName, amount, donorName, message) {
  const { subject, html } = templates.donationNotification(creatorName, amount, donorName, message);
  return sendEmail(email, subject, html);
}

async function sendDonationReceipt(email, donorName, creatorName, amount, txHash) {
  const { subject, html } = templates.donationReceipt(donorName, creatorName, amount, txHash);
  return sendEmail(email, subject, html);
}

async function sendWeeklyReport(email, creatorName, totalRevenue, donationCount, supporterCount) {
  const { subject, html } = templates.weeklyReport(creatorName, totalRevenue, donationCount, supporterCount);
  return sendEmail(email, subject, html);
}

async function testEmail(email) {
  const { subject, html } = templates.test(email);
  return sendEmail(email, subject, html);
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendDonationNotification,
  sendDonationReceipt,
  sendWeeklyReport,
  testEmail
};
