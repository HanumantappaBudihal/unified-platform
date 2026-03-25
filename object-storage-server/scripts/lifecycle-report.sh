#!/bin/bash
# Report current lifecycle rules for all MinIO buckets

set -e
MC_CMD="docker run --rm --network storage-net -e MC_HOST_storage=http://${MINIO_ROOT_USER:-admin}:${MINIO_ROOT_PASSWORD:-admin-secret-key}@storage-nginx:9000 quay.io/minio/mc:latest"

echo "=========================================="
echo "  MinIO Lifecycle Rules Report"
echo "=========================================="
echo ""

BUCKETS=$($MC_CMD ls storage/ 2>/dev/null | awk '{print $NF}' | tr -d '/')

if [ -z "$BUCKETS" ]; then
  echo "  No buckets found or MinIO is not running."
  exit 1
fi

for bucket in $BUCKETS; do
  echo "--- $bucket ---"

  # Lifecycle rules
  RULES=$($MC_CMD ilm ls "storage/$bucket" 2>/dev/null)
  if [ -n "$RULES" ] && ! echo "$RULES" | grep -q "No lifecycle"; then
    echo "$RULES" | sed 's/^/  /'
  else
    echo "  No lifecycle rules configured"
  fi

  # Versioning status
  VERSIONING=$($MC_CMD version info "storage/$bucket" 2>/dev/null | grep -i "versioning" || echo "  Unknown")
  echo "  Versioning: $VERSIONING"

  # Quota
  QUOTA=$($MC_CMD quota info "storage/$bucket" 2>/dev/null || echo "  No quota set")
  echo "  $QUOTA"

  echo ""
done

echo "=========================================="
echo "  Report complete"
echo "=========================================="
