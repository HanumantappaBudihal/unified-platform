# Shared PostgreSQL Server

A shared PostgreSQL 16 instance for applications that need a relational database.

## Quick Start

```bash
# Start PostgreSQL only
docker compose up -d

# Start with pgAdmin UI
docker compose --profile admin up -d
```

- **PostgreSQL**: `localhost:5432`
- **pgAdmin UI**: `localhost:5050` (profile: `admin`)

## Adding a New Application Database

Edit [scripts/init-databases.sh](scripts/init-databases.sh) and add a block:

```sql
CREATE USER myapp_user WITH PASSWORD '${MYAPP_DB_PASSWORD:-myapp-db-secret}';
CREATE DATABASE myapp_db OWNER myapp_user;
GRANT ALL PRIVILEGES ON DATABASE myapp_db TO myapp_user;
```

> The init script only runs on first start. For existing volumes, connect as the admin user and run the SQL manually, or delete the volume and recreate.

## Connecting from Other Services

Add the `db-network` external network to your compose file:

```yaml
services:
  my-app:
    environment:
      DATABASE_URL: postgresql://myapp_user:myapp-db-secret@shared-postgres:5432/myapp_db
    networks:
      - db-network

networks:
  db-network:
    external: true
    name: db-network
```

## Configuration

Copy `.env.example` to `.env` to customize. PostgreSQL tuning is in [config/postgresql/postgresql.conf](config/postgresql/postgresql.conf).
