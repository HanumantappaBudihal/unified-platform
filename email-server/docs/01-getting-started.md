# 01 — Getting Started

## Prerequisites

- **Docker** & **Docker Compose** (v2.x+)
- Ports `1025` (SMTP) and `8025` (Web UI) available

---

## Quick Start

```bash
cd email-server
docker compose up -d
```

Open the **Mailpit Web UI** at **http://localhost:8025** (admin / admin).

---

## Service URLs

| Service | URL | Purpose | Credentials |
|---------|-----|---------|-------------|
| Mailpit Web UI | http://localhost:8025 | View captured emails | `admin` / `admin` |
| SMTP Server | `localhost:1025` | Send emails from apps | No auth required |

---

## How It Works

Mailpit acts as a local SMTP server that **captures all outgoing emails** instead of delivering them to real recipients. This is perfect for development and testing.

```
Your App ──SMTP──▶ Mailpit (:1025) ──captures──▶ Web UI (:8025)
                        │
Keycloak ──SMTP──▶──────┘
                        │
Alertmanager ─SMTP─▶────┘
```

All emails sent by any service end up in the Mailpit inbox where you can inspect them — no real emails are ever sent.

---

## Configuration

Environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAILPIT_UI_USER` | `admin` | Web UI username |
| `MAILPIT_UI_PASSWORD` | `admin` | Web UI password |
| `MAILPIT_SMTP_PORT` | `1025` | Host port for SMTP |
| `MAILPIT_UI_PORT` | `8025` | Host port for Web UI |
| `MAILPIT_MAX_MESSAGES` | `1000` | Max emails retained |

---

## Verify It Works

```bash
# Check container is healthy
docker ps --filter name=email-mailpit

# Send a test email via curl
curl -s --url 'smtp://localhost:1025' \
  --mail-from 'test@app.local' \
  --mail-rcpt 'user@example.com' \
  --upload-file - <<EOF
From: Test <test@app.local>
To: User <user@example.com>
Subject: Test Email

Hello from the email server!
EOF
```

Then check **http://localhost:8025** — the test email should appear.

---

## Networking

Mailpit creates the `email-network` Docker network. Any service that needs to send email must join this network and use `email-mailpit` as the SMTP host.

```yaml
# In your app's docker-compose.yml
services:
  your-app:
    networks:
      - your-app-network
      - email-network

networks:
  email-network:
    external: true
    name: email-network
```

---

## Connected Services

| Service | SMTP Host | From Address | Purpose |
|---------|-----------|-------------|---------|
| Keycloak (applications realm) | `email-mailpit:1025` | `noreply@applications.local` | Password resets, verification emails |
| Keycloak (infrastructure realm) | `email-mailpit:1025` | `noreply@infrastructure.local` | Admin notifications |
| Alertmanager (Kafka) | `email-mailpit:1025` | `kafka-alerts@infrastructure.local` | Kafka alert notifications |
| Alertmanager (Cache) | `email-mailpit:1025` | `cache-alerts@infrastructure.local` | Redis alert notifications |
| Alertmanager (Storage) | `email-mailpit:1025` | `minio-alerts@infrastructure.local` | MinIO alert notifications |

---

## Stop / Reset

```bash
# Stop
docker compose down

# Stop and delete all captured emails
docker compose down -v
```
