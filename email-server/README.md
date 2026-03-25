# Email Server

Local SMTP server (Mailpit) for capturing and inspecting emails during development. Used by Keycloak, Alertmanager, and application services.

## Quick Start

```bash
# Start the email server (must start before other services that send email)
docker compose up -d
```

Open **http://localhost:8025** (admin / admin) to view captured emails.

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| Mailpit Web UI | http://localhost:8025 | View all captured emails |
| SMTP Server | `localhost:1025` | SMTP endpoint for apps |

## Documentation

| Doc | Topic |
|-----|-------|
| [01 - Getting Started](docs/01-getting-started.md) | Setup, networking, connected services |
| [02 - Integration Guide](docs/02-integration-guide.md) | Send emails from Node.js apps |

## Sending from Your App

```js
const { sendMail } = require('@shared/email-utils');

await sendMail({
  to: 'customer@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome</h1><p>Thanks for signing up.</p>',
});
```

See the [Integration Guide](docs/02-integration-guide.md) for full setup and examples.

## Startup Order

The email server creates the `email-network`. Start it **before** services that depend on it:

```bash
cd email-server && docker compose up -d    # 1. Email (creates network)
cd auth-server && docker compose up -d     # 2. Keycloak (password resets)
# ... other services
```
