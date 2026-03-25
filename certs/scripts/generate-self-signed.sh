#!/bin/bash
# Generate self-signed TLS certificates using openssl (no mkcert needed)
# These certs will show browser warnings but work for development.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_DIR="$(dirname "$SCRIPT_DIR")"

mkdir -p "$CERT_DIR/redis" "$CERT_DIR/kafka" "$CERT_DIR/nginx"

echo "=== Generating CA ==="
export MSYS_NO_PATHCONV=1
# Resolve OPENSSL_CONF for Windows Git Bash
if [ -f "/mingw64/etc/ssl/openssl.cnf" ]; then
  export OPENSSL_CONF="$(cygpath -w /mingw64/etc/ssl/openssl.cnf 2>/dev/null || echo /mingw64/etc/ssl/openssl.cnf)"
fi

openssl req -x509 -new -nodes \
  -keyout "$CERT_DIR/ca.key" \
  -out "$CERT_DIR/ca.crt" \
  -days 3650 \
  -subj "/C=US/ST=Dev/L=Local/O=InfraServers/CN=InfraServers-CA"

echo "=== Generating server certificate ==="
# Create SAN config
cat > "$CERT_DIR/san.cnf" <<EOF
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = host.docker.internal
DNS.4 = auth-keycloak
DNS.5 = authz-opa
DNS.6 = storage-nginx
DNS.7 = kafka
DNS.8 = kafka-secure
DNS.9 = redis-node-1
DNS.10 = redis-node-2
DNS.11 = redis-node-3
DNS.12 = redis-node-4
DNS.13 = redis-node-5
DNS.14 = redis-node-6
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate key + CSR
openssl req -new -nodes \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.csr" \
  -config "$CERT_DIR/san.cnf"

# Sign with CA
openssl x509 -req \
  -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/ca.crt" \
  -CAkey "$CERT_DIR/ca.key" \
  -CAcreateserial \
  -out "$CERT_DIR/server.crt" \
  -days 825 \
  -extfile "$CERT_DIR/san.cnf" \
  -extensions v3_req

# Cleanup CSR
rm -f "$CERT_DIR/server.csr" "$CERT_DIR/san.cnf" "$CERT_DIR/ca.srl"

echo "=== Copying for Redis ==="
cp "$CERT_DIR/server.crt" "$CERT_DIR/redis/server.crt"
cp "$CERT_DIR/server.key" "$CERT_DIR/redis/server.key"
cp "$CERT_DIR/ca.crt" "$CERT_DIR/redis/ca.crt"

echo "=== Copying for Nginx ==="
cp "$CERT_DIR/server.crt" "$CERT_DIR/nginx/server.crt"
cp "$CERT_DIR/server.key" "$CERT_DIR/nginx/server.key"

echo "=== Generating Kafka keystores ==="
KAFKA_PASS="${KAFKA_KEYSTORE_PASSWORD:-changeit}"

openssl pkcs12 -export \
  -in "$CERT_DIR/server.crt" \
  -inkey "$CERT_DIR/server.key" \
  -CAfile "$CERT_DIR/ca.crt" \
  -out "$CERT_DIR/kafka/server.p12" \
  -name localhost \
  -password "pass:$KAFKA_PASS"

# JKS keystore (if keytool available)
if command -v keytool &>/dev/null; then
  keytool -importkeystore \
    -srckeystore "$CERT_DIR/kafka/server.p12" \
    -srcstoretype PKCS12 \
    -srcstorepass "$KAFKA_PASS" \
    -destkeystore "$CERT_DIR/kafka/kafka.keystore.jks" \
    -deststoretype JKS \
    -deststorepass "$KAFKA_PASS" \
    -noprompt 2>/dev/null

  keytool -importcert \
    -file "$CERT_DIR/ca.crt" \
    -keystore "$CERT_DIR/kafka/kafka.truststore.jks" \
    -storepass "$KAFKA_PASS" \
    -alias ca \
    -noprompt 2>/dev/null
  echo "  Kafka JKS keystores created."
else
  echo "  keytool not found — skipping JKS. Kafka can use PKCS12 directly."
fi

echo ""
echo "============================================"
echo "  Self-Signed Certificates Generated!"
echo "============================================"
echo ""
echo "  $CERT_DIR/ca.crt           (CA certificate)"
echo "  $CERT_DIR/ca.key           (CA private key)"
echo "  $CERT_DIR/server.crt       (Server certificate)"
echo "  $CERT_DIR/server.key       (Server private key)"
echo "  $CERT_DIR/redis/           (Redis TLS)"
echo "  $CERT_DIR/nginx/           (Nginx TLS)"
echo "  $CERT_DIR/kafka/           (Kafka keystores)"
echo ""
echo "  NOTE: Browsers will show warnings for self-signed certs."
echo "  Use generate-certs.sh with mkcert for trusted certs."
echo "============================================"
