FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
USER node
CMD ["node", "src/index.js"]
