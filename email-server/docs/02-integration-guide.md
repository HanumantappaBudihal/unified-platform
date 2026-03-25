# 02 — Integration Guide

Send transactional emails (welcome, password reset, order confirmation, etc.) from your Node.js applications using the shared email utility.

---

## Prerequisites

- `email-server` running (`docker compose up -d`)
- Your app's container on the `email-network`

---

## Setup

### 1. Install the Shared Library

```bash
# From your app directory
npm install ../../shared/email-utils
```

Or add it to your `package.json`:

```json
{
  "dependencies": {
    "@shared/email-utils": "file:../../shared/email-utils"
  }
}
```

### 2. Add Environment Variables

Add to your app's `.env`:

```env
# Local dev (Mailpit) — these are the defaults, no changes needed
SMTP_HOST=email-mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM=noreply@myapp.local

# Production — swap these values:
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=apikey
# SMTP_PASS=your-api-key
# SMTP_FROM=noreply@yourdomain.com
```

### 3. Add Docker Network

In your app's `docker-compose.yml`:

```yaml
services:
  your-app:
    environment:
      SMTP_HOST: email-mailpit
      SMTP_PORT: 1025
      SMTP_FROM: noreply@myapp.local
    networks:
      - your-app-network
      - email-network

networks:
  email-network:
    external: true
    name: email-network
```

---

## Usage

### Send a Simple Email

```js
const { sendMail } = require('@shared/email-utils');

await sendMail({
  to: 'customer@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our app</h1><p>Thanks for signing up.</p>',
});
```

### Send with Plain Text Fallback

```js
await sendMail({
  to: 'customer@example.com',
  subject: 'Your order is confirmed',
  html: '<h1>Order #1234</h1><p>Thank you for your purchase.</p>',
  text: 'Order #1234 — Thank you for your purchase.',
});
```

### Send with Attachments

```js
await sendMail({
  to: 'customer@example.com',
  subject: 'Your invoice',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    { filename: 'invoice.pdf', path: '/tmp/invoice-1234.pdf' },
  ],
});
```

### Custom Sender Address

```js
await sendMail({
  to: 'customer@example.com',
  from: '"Billing" <billing@myapp.local>',
  subject: 'Payment received',
  html: '<p>We received your payment.</p>',
});
```

### Multiple Recipients

```js
await sendMail({
  to: 'user1@example.com, user2@example.com',
  subject: 'Team update',
  html: '<p>Here is your weekly summary.</p>',
});
```

---

## Health Check

Verify SMTP connectivity at startup or in a health endpoint:

```js
const { verifyConnection } = require('@shared/email-utils');

app.get('/health', async (req, res) => {
  try {
    await verifyConnection();
    res.json({ email: 'ok' });
  } catch (err) {
    res.status(503).json({ email: 'unreachable', error: err.message });
  }
});
```

---

## Express Middleware Example

```js
const { sendMail } = require('@shared/email-utils');

// POST /api/contact
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  await sendMail({
    to: 'support@myapp.local',
    subject: `Contact form: ${name}`,
    html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`,
  });

  res.json({ success: true });
});
```

---

## Custom Transport Config

If you need to override the default transport (e.g., connection pooling):

```js
const { getTransporter } = require('@shared/email-utils');

const transporter = getTransporter({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

await transporter.sendMail({ to: '...', subject: '...', html: '...' });
```

---

## Without the Shared Library

If you prefer not to use the shared library, use Nodemailer directly:

```bash
npm install nodemailer
```

```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'email-mailpit',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: false,
  tls: { rejectUnauthorized: false },
});

await transporter.sendMail({
  from: '"My App" <noreply@myapp.local>',
  to: 'customer@example.com',
  subject: 'Hello',
  html: '<p>Hello from the app!</p>',
});
```

---

## Testing Emails

1. Send an email from your app
2. Open **http://localhost:8025**
3. The email appears instantly in the Mailpit inbox
4. Click to inspect headers, HTML, plain text, and attachments

Mailpit also supports:
- **Search** — filter by sender, recipient, subject
- **HTML preview** — rendered and source view
- **Spam check** — basic deliverability analysis
- **API** — `GET http://localhost:8025/api/v1/messages` for automated testing

---

## Production Checklist

When moving to production, swap env vars — no code changes needed:

| Variable | Dev (Mailpit) | Production (example: SendGrid) |
|----------|---------------|-------------------------------|
| `SMTP_HOST` | `email-mailpit` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `1025` | `587` |
| `SMTP_SECURE` | `false` | `false` |
| `SMTP_USER` | — | `apikey` |
| `SMTP_PASS` | — | `SG.your-api-key` |
| `SMTP_FROM` | `noreply@myapp.local` | `noreply@yourdomain.com` |
