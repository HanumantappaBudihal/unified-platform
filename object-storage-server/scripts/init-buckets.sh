#!/bin/sh
set -e

echo "=== Waiting for MinIO to be ready ==="
sleep 10

echo "=== Configuring MinIO client ==="
mc alias set storage http://storage-nginx:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

echo "=== Creating application buckets ==="
mc mb --ignore-existing storage/document-svc
mc mb --ignore-existing storage/media-svc
mc mb --ignore-existing storage/hr-portal
mc mb --ignore-existing storage/analytics-svc
mc mb --ignore-existing storage/shared

echo "=== Enabling versioning on buckets ==="
mc version enable storage/document-svc
mc version enable storage/media-svc
mc version enable storage/hr-portal

echo "=== Setting bucket quotas ==="
mc quota set storage/document-svc --size 10GiB
mc quota set storage/media-svc --size 50GiB
mc quota set storage/hr-portal --size 5GiB
mc quota set storage/analytics-svc --size 20GiB
mc quota set storage/shared --size 10GiB

echo "=== Creating IAM policies ==="

# document-svc policy
cat > /tmp/policy-document-svc.json <<'POLICY'
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
        "s3:AbortMultipartUpload",
        "s3:GetBucketVersioning",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::document-svc",
        "arn:aws:s3:::document-svc/*"
      ]
    }
  ]
}
POLICY
mc admin policy create storage document-svc-policy /tmp/policy-document-svc.json

# media-svc policy
cat > /tmp/policy-media-svc.json <<'POLICY'
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
        "arn:aws:s3:::media-svc",
        "arn:aws:s3:::media-svc/*"
      ]
    }
  ]
}
POLICY
mc admin policy create storage media-svc-policy /tmp/policy-media-svc.json

# hr-portal policy
cat > /tmp/policy-hr-portal.json <<'POLICY'
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
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::hr-portal",
        "arn:aws:s3:::hr-portal/*"
      ]
    }
  ]
}
POLICY
mc admin policy create storage hr-portal-policy /tmp/policy-hr-portal.json

# analytics-svc policy
cat > /tmp/policy-analytics-svc.json <<'POLICY'
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
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::analytics-svc",
        "arn:aws:s3:::analytics-svc/*"
      ]
    }
  ]
}
POLICY
mc admin policy create storage analytics-svc-policy /tmp/policy-analytics-svc.json

# shared bucket policy (read-only for all apps)
cat > /tmp/policy-shared-readonly.json <<'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::shared",
        "arn:aws:s3:::shared/*"
      ]
    }
  ]
}
POLICY
mc admin policy create storage shared-readonly-policy /tmp/policy-shared-readonly.json

echo "=== Creating IAM users ==="
mc admin user add storage "${MINIO_DOCUMENT_SVC_KEY}" "${MINIO_DOCUMENT_SVC_SECRET}"
mc admin user add storage "${MINIO_MEDIA_SVC_KEY}" "${MINIO_MEDIA_SVC_SECRET}"
mc admin user add storage "${MINIO_HR_PORTAL_KEY}" "${MINIO_HR_PORTAL_SECRET}"
mc admin user add storage "${MINIO_ANALYTICS_SVC_KEY}" "${MINIO_ANALYTICS_SVC_SECRET}"

echo "=== Attaching policies to users ==="
mc admin policy attach storage document-svc-policy --user "${MINIO_DOCUMENT_SVC_KEY}"
mc admin policy attach storage media-svc-policy --user "${MINIO_MEDIA_SVC_KEY}"
mc admin policy attach storage hr-portal-policy --user "${MINIO_HR_PORTAL_KEY}"
mc admin policy attach storage analytics-svc-policy --user "${MINIO_ANALYTICS_SVC_KEY}"

# All apps get shared read-only
mc admin policy attach storage shared-readonly-policy --user "${MINIO_DOCUMENT_SVC_KEY}"
mc admin policy attach storage shared-readonly-policy --user "${MINIO_MEDIA_SVC_KEY}"
mc admin policy attach storage shared-readonly-policy --user "${MINIO_HR_PORTAL_KEY}"
mc admin policy attach storage shared-readonly-policy --user "${MINIO_ANALYTICS_SVC_KEY}"

echo "=== Setting lifecycle rules ==="

# Auto-delete temp files after 7 days
cat > /tmp/lifecycle-temp.json <<'LIFECYCLE'
{
  "Rules": [
    {
      "ID": "cleanup-temp",
      "Status": "Enabled",
      "Filter": { "Prefix": "tmp/" },
      "Expiration": { "Days": 7 }
    }
  ]
}
LIFECYCLE
mc ilm import storage/document-svc < /tmp/lifecycle-temp.json
mc ilm import storage/media-svc < /tmp/lifecycle-temp.json

# Delete old versions after 30 days
cat > /tmp/lifecycle-versions.json <<'LIFECYCLE'
{
  "Rules": [
    {
      "ID": "cleanup-old-versions",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    }
  ]
}
LIFECYCLE
mc ilm import storage/document-svc < /tmp/lifecycle-versions.json
mc ilm import storage/media-svc < /tmp/lifecycle-versions.json

echo ""
echo "============================================"
echo "  MinIO Storage Server Initialized!"
echo "============================================"
echo ""
echo "  Buckets: document-svc, media-svc, hr-portal, analytics-svc, shared"
echo ""
echo "  App Credentials (from environment variables):"
echo "  ─────────────────────────────────────────"
echo "  document-svc  → key: ${MINIO_DOCUMENT_SVC_KEY}"
echo "  media-svc     → key: ${MINIO_MEDIA_SVC_KEY}"
echo "  hr-portal     → key: ${MINIO_HR_PORTAL_KEY}"
echo "  analytics-svc → key: ${MINIO_ANALYTICS_SVC_KEY}"
echo ""
echo "  S3 Endpoint: http://localhost:9000"
echo "  Console:     http://localhost:9001"
echo "============================================"
