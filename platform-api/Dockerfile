FROM node:20-alpine

WORKDIR /app

# MinIO admin client — used by the minio orchestrator to create per-app
# service accounts, policies, and bucket quotas (not covered by the S3 SDK).
RUN apk add --no-cache ca-certificates curl \
  && curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
  && chmod +x /usr/local/bin/mc

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

EXPOSE 3020

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3020/api/v1/health || exit 1

CMD ["node", "src/server.js"]
