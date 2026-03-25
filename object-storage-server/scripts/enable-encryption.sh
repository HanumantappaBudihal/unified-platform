#!/bin/bash
# Enable server-side encryption (SSE-S3) on MinIO buckets

set -e

echo "=========================================="
echo "  MinIO Server-Side Encryption (SSE-S3)"
echo "=========================================="
echo ""
echo "MinIO supports encryption at rest using:"
echo ""
echo "  1. SSE-S3  — MinIO manages keys (simplest)"
echo "  2. SSE-KMS — External KMS (Vault, AWS KMS)"
echo "  3. SSE-C   — Client provides keys per request"
echo ""
echo "To enable SSE-S3 with auto-encryption:"
echo ""
echo "  Add to docker-compose environment:"
echo "    MINIO_KMS_SECRET_KEY: 'my-key:Y2hhbmdlbWVjaGFuZ2VtZWNoYW5nZW1lY2hhbmdlbQ=='"
echo ""
echo "  Then set auto-encryption per bucket:"
echo "    mc encrypt set sse-s3 storage/document-svc"
echo "    mc encrypt set sse-s3 storage/media-svc"
echo "    mc encrypt set sse-s3 storage/hr-portal"
echo ""

# Check if encryption is already configured
if docker exec minio-1 env | grep -q MINIO_KMS 2>/dev/null; then
  echo "KMS is configured. Setting auto-encryption on buckets..."
  MC="docker run --rm --network storage-net -e MC_HOST_storage=http://admin:admin-secret-key@storage-nginx:9000 quay.io/minio/mc:latest"
  for bucket in document-svc media-svc hr-portal analytics-svc; do
    $MC encrypt set sse-s3 "storage/$bucket" 2>/dev/null && \
      echo "  Enabled SSE-S3 on $bucket" || \
      echo "  Skipped $bucket (encryption not available)"
  done
else
  echo "KMS not configured. Add MINIO_KMS_SECRET_KEY to enable."
fi
echo ""
