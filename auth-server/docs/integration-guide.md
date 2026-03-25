# Auth Server — Integration Guide

## Services

| Service | URL | Purpose |
|---|---|---|
| Keycloak | http://localhost:8080 | Authentication, SSO, user management |
| Mailpit (Email) | http://localhost:8025 | View password reset & verification emails |

> **Authorization (OPA)** is in a separate server: `authz-server` at `:8181` / `:3008`

## Quick Start

```bash
# Start the email server first (required for password reset emails)
cd email-server && docker compose up -d

cd auth-server
docker compose up -d
```

Wait ~30s for Keycloak to start, then visit http://localhost:8080/admin (admin / admin).

## Email (Password Resets & Verification)

Both realms are configured to send emails via the local [Email Server](../../email-server/README.md) (Mailpit). When a user triggers a password reset or email verification, the email is captured in Mailpit at **http://localhost:8025**.

| Realm | From Address |
|-------|-------------|
| `applications` | `noreply@applications.local` |
| `infrastructure` | `noreply@infrastructure.local` |

> **Prerequisite:** The `email-server` must be running before starting auth-server.

## Realms

### `infrastructure` — For infra portals
- Users: `admin` / `admin`, `viewer` / `viewer`
- Roles: `infra-admin`, `infra-viewer`
- Clients: `gateway-portal`, `kafka-portal`, `cache-portal`, `storage-portal`, `grafana`, `minio-console`

### `applications` — For end-user apps
- Users: `demo-user` / `demo`, `demo-admin` / `demo`
- Roles: `app-user`, `app-admin`, `service-account`
- Clients: `task-manager`, `task-manager-api`, `sample-web-app`, `sample-backend-svc`

## Integrating a Next.js App (NextAuth.js)

### 1. Install

```bash
npm install next-auth
```

### 2. Environment Variables

```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=applications          # or "infrastructure" for infra portals
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-secret   # omit for public clients
NEXTAUTH_SECRET=random-32-char-string
NEXTAUTH_URL=http://localhost:3000
```

### 3. Auth Route (`src/app/api/auth/[...nextauth]/route.ts`)

```typescript
import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

const handler = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    }),
  ],
});

export { handler as GET, handler as POST };
```

### 4. Middleware (`src/middleware.ts`)

```typescript
export { default } from "next-auth/middleware";
export const config = { matcher: ["/((?!api/auth|_next|favicon.ico).*)"] };
```

## Integrating a Backend Service (JWT Validation)

Validate the JWT `Authorization: Bearer <token>` header against Keycloak's JWKS:

```
GET http://localhost:8080/realms/{realm}/protocol/openid-connect/certs
```

## Adding a New Application

1. **Keycloak**: Add a client in the `applications` realm (Admin Console → Clients → Create)
2. **AuthZ Server**: Update roles in `authz-server/config/opa/data/roles.json`
3. **AuthZ Server**: Optionally add custom policy in `authz-server/config/opa/policies/`

## Network Access

Other docker-compose services can reach Keycloak by joining `auth-network`:

```yaml
services:
  your-app:
    networks:
      - auth-network

networks:
  auth-network:
    external: true
    name: auth-network
```

Internal URL: `http://auth-keycloak:8080`
