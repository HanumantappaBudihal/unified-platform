const Redis = require('ioredis');

const REDIS_NODES = (process.env.REDIS_NODES || 'redis-node-1:6371,redis-node-2:6372,redis-node-3:6373')
  .split(',')
  .map((n) => { const [host, port] = n.trim().split(':'); return { host, port: parseInt(port) }; });

const clusterOpts = {
  redisOptions: {
    username: process.env.REDIS_USERNAME || 'catalog-svc',
    password: process.env.REDIS_PASSWORD || 'catalog-secret',
  },
  clusterRetryStrategy: (times) => Math.min(times * 200, 5000),
};

const redis = new Redis.Cluster(REDIS_NODES, clusterOpts);
const subscriber = new Redis.Cluster(REDIS_NODES, clusterOpts);

const CACHE_TTL = 300; // 5 minutes
const INVALIDATION_CHANNEL = 'catalog:invalidate';

// Simulated "database" of products
const productDB = [
  { id: 1, name: 'Wireless Mouse', category: 'electronics', price: 29.99, stock: 150 },
  { id: 2, name: 'Mechanical Keyboard', category: 'electronics', price: 89.99, stock: 75 },
  { id: 3, name: 'USB-C Hub', category: 'electronics', price: 49.99, stock: 200 },
  { id: 4, name: 'Monitor Stand', category: 'accessories', price: 39.99, stock: 120 },
  { id: 5, name: 'Webcam HD', category: 'electronics', price: 69.99, stock: 90 },
  { id: 6, name: 'Desk Lamp', category: 'accessories', price: 34.99, stock: 180 },
  { id: 7, name: 'Laptop Sleeve', category: 'accessories', price: 24.99, stock: 300 },
  { id: 8, name: 'Bluetooth Speaker', category: 'electronics', price: 59.99, stock: 110 },
  { id: 9, name: 'Noise Cancelling Headphones', category: 'electronics', price: 199.99, stock: 45 },
  { id: 10, name: 'Ergonomic Chair', category: 'furniture', price: 349.99, stock: 25 },
  { id: 11, name: 'Standing Desk', category: 'furniture', price: 499.99, stock: 15 },
  { id: 12, name: 'Cable Management Kit', category: 'accessories', price: 19.99, stock: 500 },
  { id: 13, name: 'Screen Protector', category: 'accessories', price: 14.99, stock: 800 },
  { id: 14, name: 'Wireless Charger', category: 'electronics', price: 24.99, stock: 250 },
  { id: 15, name: 'Mousepad XL', category: 'accessories', price: 19.99, stock: 400 },
  { id: 16, name: 'Portable SSD 1TB', category: 'storage', price: 89.99, stock: 60 },
  { id: 17, name: 'USB Flash Drive 128GB', category: 'storage', price: 14.99, stock: 350 },
  { id: 18, name: 'HDMI Cable 2m', category: 'cables', price: 9.99, stock: 600 },
  { id: 19, name: 'Ethernet Cable Cat6', category: 'cables', price: 7.99, stock: 700 },
  { id: 20, name: 'Power Strip Surge Protector', category: 'accessories', price: 29.99, stock: 220 },
];

const CATEGORIES = ['electronics', 'accessories', 'furniture', 'storage', 'cables'];

let cacheHits = 0;
let cacheMisses = 0;
let invalidations = 0;
let priceUpdates = 0;

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Cache-aside: Get product
async function getProduct(id) {
  const cacheKey = `catalog:product:${id}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    cacheHits++;
    const product = JSON.parse(cached);
    console.log(`[CACHE HIT]  Product #${id}: ${product.name} ($${product.price})`);
    return product;
  }

  // Cache miss — "fetch from database"
  cacheMisses++;
  const product = productDB.find(p => p.id === id);
  if (!product) {
    console.log(`[CACHE MISS] Product #${id}: NOT FOUND`);
    return null;
  }

  // Cache the result
  await redis.set(cacheKey, JSON.stringify(product), 'EX', CACHE_TTL);
  console.log(`[CACHE MISS] Product #${id}: ${product.name} — cached for ${CACHE_TTL}s`);
  return product;
}

// Cache-aside: Get category listing
async function getCategoryProducts(category) {
  const cacheKey = `catalog:category:${category}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    cacheHits++;
    const products = JSON.parse(cached);
    console.log(`[CACHE HIT]  Category "${category}": ${products.length} products`);
    return products;
  }

  cacheMisses++;
  const products = productDB.filter(p => p.category === category);
  await redis.set(cacheKey, JSON.stringify(products), 'EX', CACHE_TTL);
  console.log(`[CACHE MISS] Category "${category}": ${products.length} products — cached`);
  return products;
}

// Update product price — triggers cache invalidation
async function updateProductPrice(id) {
  const product = productDB.find(p => p.id === id);
  if (!product) return;

  const oldPrice = product.price;
  const change = (Math.random() - 0.5) * 20; // +/- $10
  product.price = Math.max(4.99, parseFloat((product.price + change).toFixed(2)));
  priceUpdates++;

  console.log(`[UPDATE] Product #${id} "${product.name}": $${oldPrice} → $${product.price}`);

  // Delete stale cache
  await redis.del(`catalog:product:${id}`);
  await redis.del(`catalog:category:${product.category}`);

  // Publish invalidation event
  await redis.publish(INVALIDATION_CHANNEL, JSON.stringify({
    type: 'product-updated',
    productId: id,
    category: product.category,
    timestamp: new Date().toISOString(),
  }));

  invalidations++;
}

// Bulk cache warming
async function warmCache() {
  console.log('[WARM] Warming cache with all products...');
  let warmed = 0;

  for (const product of productDB) {
    const key = `catalog:product:${product.id}`;
    await redis.set(key, JSON.stringify(product), 'EX', CACHE_TTL);
    warmed++;
  }

  for (const cat of CATEGORIES) {
    const products = productDB.filter(p => p.category === cat);
    await redis.set(`catalog:category:${cat}`, JSON.stringify(products), 'EX', CACHE_TTL);
    warmed++;
  }

  console.log(`[WARM] Cache warmed: ${warmed} keys\n`);
}

// Subscribe to invalidation events
async function setupInvalidationListener() {
  subscriber.subscribe(INVALIDATION_CHANNEL, (err) => {
    if (err) {
      console.error('[SUB ERROR]', err.message);
      return;
    }
    console.log(`[SUB] Subscribed to ${INVALIDATION_CHANNEL}`);
  });

  subscriber.on('message', (channel, message) => {
    try {
      const event = JSON.parse(message);
      console.log(`[INVALIDATION] Received: ${event.type} — product #${event.productId} (${event.category})`);
    } catch {
      console.log(`[INVALIDATION] Received raw message: ${message}`);
    }
  });
}

// Simulate catalog activity
async function simulateActivity() {
  const action = Math.random();

  if (action < 0.5) {
    // Lookup a random product (most common)
    const id = randomInt(1, 20);
    await getProduct(id);

  } else if (action < 0.75) {
    // Lookup a category
    const cat = randomItem(CATEGORIES);
    await getCategoryProducts(cat);

  } else if (action < 0.9) {
    // Update a product price (triggers invalidation)
    const id = randomInt(1, 20);
    await updateProductPrice(id);

  } else {
    // Bulk lookup — simulating a page load
    const ids = [];
    for (let i = 0; i < randomInt(3, 6); i++) {
      ids.push(randomInt(1, 20));
    }
    console.log(`[BULK] Loading products: ${ids.join(', ')}`);
    await Promise.all(ids.map(getProduct));
  }
}

// Stats logging
function logStats() {
  const total = cacheHits + cacheMisses;
  const ratio = total > 0 ? ((cacheHits / total) * 100).toFixed(1) : '0.0';
  console.log('\n--- Catalog Service Stats ---');
  console.log(`Cache Hits: ${cacheHits} | Misses: ${cacheMisses} | Hit Ratio: ${ratio}%`);
  console.log(`Price Updates: ${priceUpdates} | Invalidations: ${invalidations}`);
  console.log(`Products in DB: ${productDB.length} | Categories: ${CATEGORIES.length}`);
  console.log('-----------------------------\n');
}

// Main
async function main() {
  console.log('=== Catalog Service Starting ===');
  console.log(`Redis Cluster: ${REDIS_NODES.map(n => `${n.host}:${n.port}`).join(', ')}`);
  console.log(`Cache TTL: ${CACHE_TTL}s | Products: ${productDB.length}`);
  console.log('');

  await new Promise((resolve) => {
    redis.once('ready', resolve);
    redis.once('error', () => {
      console.log('Waiting for Redis cluster...');
      setTimeout(resolve, 5000);
    });
  });

  console.log('Connected to Redis cluster!\n');

  await setupInvalidationListener();
  await warmCache();

  // Activity every 2-4 seconds
  setInterval(async () => {
    try {
      await simulateActivity();
    } catch (err) {
      console.error('[ERROR]', err.message);
    }
  }, randomInt(2000, 4000));

  // Stats every 30 seconds
  setInterval(logStats, 30000);
}

redis.on('error', (err) => console.error('[REDIS ERROR]', err.message));
subscriber.on('error', (err) => console.error('[SUB REDIS ERROR]', err.message));

main().catch(console.error);
