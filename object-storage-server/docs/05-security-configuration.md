# Security Configuration

## IAM Users & Policies

### Default Users

| User | Access Key | Bucket Access | Shared Access |
|---|---|---|---|
| admin | admin | ALL | ALL |
| document-svc | document-svc-key | document-svc (RW) | shared (RO) |
| media-svc | media-svc-key | media-svc (RW) | shared (RO) |
| hr-portal | hr-portal-key | hr-portal (RW) | shared (RO) |
| analytics-svc | analytics-svc-key | analytics-svc (RW) | shared (RO) |

### Policy Structure

Each application policy follows this template:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload"
      ],
      "Resource": [
        "arn:aws:s3:::APP_BUCKET",
        "arn:aws:s3:::APP_BUCKET/*"
      ]
    }
  ]
}
```

### Read-Only Policy (Shared Bucket)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": ["arn:aws:s3:::shared", "arn:aws:s3:::shared/*"]
    }
  ]
}
```

### Creating Restricted Policies

**Upload-only (write, no read)**:
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject"],
    "Resource": ["arn:aws:s3:::bucket/*"]
  }]
}
```

**Read-only specific prefix**:
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": ["arn:aws:s3:::bucket/public/*"]
  }]
}
```

## Bucket Quotas

| Bucket | Quota |
|---|---|
| document-svc | 10 GiB |
| media-svc | 50 GiB |
| hr-portal | 5 GiB |
| analytics-svc | 20 GiB |
| shared | 10 GiB |

### Managing Quotas

```bash
mc alias set storage http://localhost:9000 admin admin-secret-key

# View quota
mc quota info storage/document-svc

# Update quota
mc quota set storage/document-svc --size 20GiB

# Remove quota
mc quota clear storage/document-svc
```

## Versioning

Enabled on: `document-svc`, `media-svc`, `hr-portal`

### Managing Versions

```bash
# List versions of a file
mc ls --versions storage/document-svc/invoices/invoice-001.txt

# Restore a previous version
mc cp --version-id VERSION_ID storage/document-svc/file.txt storage/document-svc/file.txt
```

## Lifecycle Rules

### Current Rules

**Temp file cleanup (7 days)**:
- Applied to: document-svc, media-svc
- Prefix: `tmp/`
- Action: Delete after 7 days

**Old version cleanup (30 days)**:
- Applied to: document-svc, media-svc
- Action: Delete non-current versions after 30 days

### Managing Lifecycle Rules

```bash
# View rules
mc ilm ls storage/document-svc

# Export rules
mc ilm export storage/document-svc

# Add new rule via JSON import
mc ilm import storage/my-bucket < lifecycle-rules.json
```

## Network Security (Production)

### TLS Setup (Recommended for Production)

1. Place certificates in MinIO:
```yaml
volumes:
  - ./certs/public.crt:/root/.minio/certs/public.crt
  - ./certs/private.key:/root/.minio/certs/private.key
```

2. Update Nginx for TLS termination:
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/certs/public.crt;
    ssl_certificate_key /etc/nginx/certs/private.key;
    # ... proxy config ...
}
```

3. Update clients: `useSSL: true`
