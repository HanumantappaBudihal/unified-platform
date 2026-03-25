const nodemailer = require('nodemailer');

const defaultConfig = {
  host: process.env.SMTP_HOST || 'email-mailpit',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: process.env.SMTP_SECURE === 'true',
  ...(process.env.SMTP_USER && {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }),
  tls: { rejectUnauthorized: process.env.SMTP_SECURE === 'true' },
};

let transporter;

/**
 * Get or create the shared transporter instance.
 * @param {object} [overrides] - Optional nodemailer transport config overrides.
 */
function getTransporter(overrides) {
  if (!transporter || overrides) {
    transporter = nodemailer.createTransport({ ...defaultConfig, ...overrides });
  }
  return transporter;
}

/**
 * Send an email.
 * @param {object} options
 * @param {string} options.to       - Recipient address(es).
 * @param {string} options.subject  - Email subject.
 * @param {string} [options.text]   - Plain-text body.
 * @param {string} [options.html]   - HTML body.
 * @param {string} [options.from]   - Sender (defaults to SMTP_FROM env).
 * @param {object[]} [options.attachments] - Nodemailer attachments array.
 * @returns {Promise<object>} Nodemailer send result.
 */
async function sendMail({ to, subject, text, html, from, attachments }) {
  const transport = getTransporter();
  return transport.sendMail({
    from: from || process.env.SMTP_FROM || 'noreply@app.local',
    to,
    subject,
    text,
    html,
    attachments,
  });
}

/**
 * Verify the SMTP connection is working.
 * @returns {Promise<boolean>}
 */
async function verifyConnection() {
  const transport = getTransporter();
  return transport.verify();
}

module.exports = { getTransporter, sendMail, verifyConnection };
