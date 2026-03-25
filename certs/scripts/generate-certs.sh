#!/bin/bash
# Generate locally-trusted TLS certificates using mkcert
# Prerequisites: Install mkcert (https://github.com/nicejob/mkcert)
#   - Windows: choco install mkcert  OR  scoop install mkcert
#   - macOS: brew install mkcert
#   - Linux: See https://github.com/nicejob/mkcert#installation

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Installing local CA (one-time) ==="
mkcert -install

echo ""
echo "=== Generating certificates ==="

# Shared wildcard cert for all services on localhost
mkcert \
  -cert-file "$CERT_DIR/server.crt" \
  -key-file "$CERT_DIR/server.key" \
  localhost \
  127.0.0.1 \
  ::1 \
  "*.localhost" \
  host.docker.internal

# Copy CA cert for containers that need to trust it
cp "$(mkcert -CAROOT)/rootCA.pem" "$CERT_DIR/ca.crt"

# Redis needs specific format
cp "$CERT_DIR/server.crt" "$CERT_DIR/redis/server.crt"
cp "$CERT_DIR/server.key" "$CERT_DIR/redis/server.key"
cp "$CERT_DIR/ca.crt" "$CERT_DIR/redis/ca.crt"

# Kafka needs JKS keystore
echo ""
echo "=== Generating Kafka JKS keystore ==="
KAFKA_PASS="${KAFKA_KEYSTORE_PASSWORD:-changeit}"

# Convert to PKCS12 first
openssl pkcs12 -export \
  -in "$CERT_DIR/server.crt" \
  -inkey "$CERT_DIR/server.key" \
  -out "$CERT_DIR/kafka/server.p12" \
  -name localhost \
  -password "pass:$KAFKA_PASS"

# Convert PKCS12 to JKS keystore
keytool -importkeystore \
  -srckeystore "$CERT_DIR/kafka/server.p12" \
  -srcstoretype PKCS12 \
  -srcstorepass "$KAFKA_PASS" \
  -destkeystore "$CERT_DIR/kafka/kafka.keystore.jks" \
  -deststoretype JKS \
  -deststorepass "$KAFKA_PASS" \
  -noprompt 2>/dev/null || true

# Create JKS truststore with CA
keytool -importcert \
  -file "$CERT_DIR/ca.crt" \
  -keystore "$CERT_DIR/kafka/kafka.truststore.jks" \
  -storepass "$KAFKA_PASS" \
  -alias ca \
  -noprompt 2>/dev/null || true

echo ""
echo "============================================"
echo "  Certificates Generated!"
echo "============================================"
echo ""
echo "  Files created:"
echo "  ─────────────────────────────────────────"
echo "  $CERT_DIR/server.crt        (TLS certificate)"
echo "  $CERT_DIR/server.key        (Private key)"
echo "  $CERT_DIR/ca.crt            (CA certificate)"
echo "  $CERT_DIR/redis/            (Redis TLS files)"
echo "  $CERT_DIR/kafka/            (Kafka JKS keystores)"
echo ""
echo "  These certs are trusted by your local machine."
echo "  For Docker containers, mount ca.crt and add to trust store."
echo "============================================"
