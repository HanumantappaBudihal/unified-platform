# 05 — Security Configuration

ACL users, per-app isolation, passwords, and TLS for the centralized Redis Cache Server.

---

## ACL (Access Control List)

Redis ACLs provide per-application authentication and authorization.

### Default Users

| User | Password | Key Access | Commands | Purpose |
|------|----------|-----------|----------|---------|
| `admin` | `admin-secret` | `~*` (all keys) | `+@all` | Portal, management, monitoring |
| `session-svc` | `session-secret` | `~sessions:*` | `+@all -@admin -@dangerous` | Session Service mock app |
| `catalog-svc` | `catalog-secret` | `~catalog:*` | `+@all -@admin -@dangerous` | Catalog Service mock app |
| `default` | (disabled) | — | — | Disabled for security |

### ACL File (`config/redis/users.acl`)

```
# Admin — full access
user admin on >admin-secret ~* &* +@all

# Session Service — only sessions:* keys
user session-svc on >session-secret ~sessions:* &sessions:* +@all -@admin -@dangerous

# Catalog Service — only catalog:* keys
user catalog-svc on >catalog-secret ~catalog:* &catalog:* +@all -@admin -@dangerous

# Disable default user
user default off
```

### ACL Command Categories

| Category | Commands | Notes |
|----------|----------|-------|
| `@read` | GET, MGET, HGETALL, SCAN, etc. | Read-only access |
| `@write` | SET, DEL, HSET, LPUSH, etc. | Write access |
| `@pubsub` | PUBLISH, SUBSCRIBE, etc. | Pub/Sub messaging |
| `@admin` | CONFIG, ACL, CLUSTER, etc. | Admin operations |
| `@dangerous` | FLUSHALL, FLUSHDB, DEBUG, KEYS, etc. | Potentially destructive |
| `@all` | Everything | Full access |

---

## Adding a New Application

### Step 1: Define ACL User

Add to `config/redis/users.acl`:

```
user myapp-svc on >myapp-secret ~myapp:* &myapp:* +@all -@admin -@dangerous
```

### Step 2: Apply ACL Changes

```bash
# Option A: Reload ACL file (no restart needed)
docker exec redis-node-1 redis-cli -p 6371 -a admin-secret ACL LOAD

# Option B: Restart the cluster
bash scripts/stop.sh && bash scripts/start.sh
```

### Step 3: Verify

```bash
# List all users
docker exec redis-node-1 redis-cli -p 6371 -a admin-secret ACL LIST

# Test authentication
docker exec redis-node-1 redis-cli -p 6371 --user myapp-svc --pass myapp-secret PING

# Verify key restriction
docker exec redis-node-1 redis-cli -p 6371 --user myapp-svc --pass myapp-secret SET myapp:test "hello"
# OK

docker exec redis-node-1 redis-cli -p 6371 --user myapp-svc --pass myapp-secret SET other:test "hello"
# (error) NOPERM this user has no permissions to access one of the keys
```

---

## Key Prefix Isolation

Each application is restricted to its own key prefix. This provides:

- **Data isolation** — apps cannot read/write each other's data
- **Namespace clarity** — easy to identify which app owns a key
- **Monitoring** — track key count and memory per prefix
- **Cleanup** — easy to purge an app's cache: `SCAN` + `DEL` by prefix

### Naming Convention

```
<app-prefix>:<resource-type>:<identifier>
```

### Reserved Prefixes

| Prefix | Owner | Purpose |
|--------|-------|---------|
| `sessions:*` | Session Service | User sessions, rate limits |
| `catalog:*` | Catalog Service | Product cache, categories |
| `system:*` | Admin only | Internal cluster metadata |

---

## Password Management

### Changing Passwords

1. Update `config/redis/users.acl` with new password
2. Reload ACLs on all nodes:
   ```bash
   for port in 6371 6372 6373 6374 6375 6376; do
     docker exec redis-node-1 redis-cli -p $port -a admin-secret ACL LOAD
   done
   ```
3. Update application configuration with new password
4. Restart affected applications

### Password Requirements

- Minimum 12 characters recommended
- Use unique passwords per application
- Store passwords in environment variables, not in code
- Rotate passwords periodically

---

## TLS Encryption (Optional)

For production deployments, enable TLS to encrypt data in transit.

### Generate Certificates

```bash
# Generate CA
openssl genrsa -out config/redis/tls/ca.key 4096
openssl req -x509 -new -nodes -key config/redis/tls/ca.key -days 365 -out config/redis/tls/ca.crt -subj "/CN=Redis-CA"

# Generate server cert
openssl genrsa -out config/redis/tls/redis.key 2048
openssl req -new -key config/redis/tls/redis.key -out config/redis/tls/redis.csr -subj "/CN=redis"
openssl x509 -req -in config/redis/tls/redis.csr -CA config/redis/tls/ca.crt -CAkey config/redis/tls/ca.key -CAcreateserial -out config/redis/tls/redis.crt -days 365
```

### Enable TLS in redis.conf

```conf
tls-port 6371
port 0
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-auth-clients optional
tls-cluster yes
tls-replication yes
```

### Connect with TLS

```javascript
const redis = new Redis.Cluster([
  { host: 'localhost', port: 6371 },
], {
  redisOptions: {
    username: 'myapp-svc',
    password: 'myapp-secret',
    tls: {
      ca: fs.readFileSync('ca.crt'),
    },
  },
});
```

---

## Security Checklist

- [ ] Disable the `default` user
- [ ] Set strong passwords for all ACL users
- [ ] Use key prefix restrictions per application
- [ ] Block `@admin` and `@dangerous` commands for app users
- [ ] Enable `protected-mode yes` in redis.conf
- [ ] Bind to specific interfaces (not `0.0.0.0` in production)
- [ ] Enable TLS for production deployments
- [ ] Use firewall rules to restrict Redis port access
- [ ] Rotate passwords periodically
- [ ] Monitor failed authentication attempts
