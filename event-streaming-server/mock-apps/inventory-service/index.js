const { Kafka } = require('kafkajs');

const BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'inventory-service',
  brokers: [BROKER],
  retry: { retries: 5, initialRetryTime: 1000 },
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'inventory-service-group' });

// --- In-memory stock database ---

const stockDb = {
  'PROD-001': { name: 'Wireless Headphones', stock: 150, reserved: 0, warehouse: 'WH-EAST' },
  'PROD-002': { name: 'Mechanical Keyboard', stock: 80, reserved: 0, warehouse: 'WH-EAST' },
  'PROD-003': { name: 'USB-C Hub', stock: 200, reserved: 0, warehouse: 'WH-WEST' },
  'PROD-004': { name: '4K Monitor', stock: 45, reserved: 0, warehouse: 'WH-EAST' },
  'PROD-005': { name: 'Ergonomic Mouse', stock: 120, reserved: 0, warehouse: 'WH-WEST' },
  'PROD-006': { name: 'Laptop Stand', stock: 95, reserved: 0, warehouse: 'WH-WEST' },
  'PROD-007': { name: 'Webcam HD', stock: 60, reserved: 0, warehouse: 'WH-EAST' },
  'PROD-008': { name: 'Noise Cancelling Earbuds', stock: 35, reserved: 0, warehouse: 'WH-WEST' },
};

const LOW_STOCK_THRESHOLD = 20;

// --- Consumer: React to order events ---

async function consumeOrderEvents() {
  await consumer.connect();
  await consumer.subscribe({
    topics: [
      'orders.checkout.order-created',
      'orders.checkout.order-completed',
      'orders.checkout.order-cancelled',
    ],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const order = JSON.parse(message.value.toString());

      if (topic === 'orders.checkout.order-created') {
        await handleOrderCreated(order);
      } else if (topic === 'orders.checkout.order-completed') {
        await handleOrderCompleted(order);
      } else if (topic === 'orders.checkout.order-cancelled') {
        await handleOrderCancelled(order);
      }
    },
  });

  console.log('[Inventory Service] Consumer subscribed to order events');
}

async function handleOrderCreated(order) {
  console.log(`\n[Inventory] Processing order ${order.orderId} (${order.items.length} items)`);

  for (const item of order.items) {
    const product = stockDb[item.productId];
    if (!product) {
      console.log(`  [WARN] Unknown product: ${item.productId}`);
      continue;
    }

    if (product.stock >= item.quantity) {
      product.stock -= item.quantity;
      product.reserved += item.quantity;

      // Produce stock-reserved event
      await producer.send({
        topic: 'inventory.warehouse.stock-reserved',
        messages: [{
          key: item.productId,
          value: JSON.stringify({
            orderId: order.orderId,
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            warehouse: product.warehouse,
            remainingStock: product.stock,
            reservedAt: new Date().toISOString(),
          }),
          headers: {
            'event-type': 'stock-reserved',
            'source': 'inventory-service',
          },
        }],
      });

      console.log(`  Reserved: ${product.name} x${item.quantity} (stock: ${product.stock}, reserved: ${product.reserved})`);

      // Check low stock
      if (product.stock <= LOW_STOCK_THRESHOLD) {
        await producer.send({
          topic: 'inventory.warehouse.low-stock-alert',
          messages: [{
            key: item.productId,
            value: JSON.stringify({
              productId: item.productId,
              productName: product.name,
              currentStock: product.stock,
              threshold: LOW_STOCK_THRESHOLD,
              warehouse: product.warehouse,
              severity: product.stock <= 5 ? 'critical' : 'warning',
              alertedAt: new Date().toISOString(),
            }),
            headers: {
              'event-type': 'low-stock-alert',
              'source': 'inventory-service',
              'severity': product.stock <= 5 ? 'critical' : 'warning',
            },
          }],
        });
        console.log(`  LOW STOCK ALERT: ${product.name} (${product.stock} remaining)`);
      }
    } else {
      console.log(`  [INSUFFICIENT] ${product.name}: need ${item.quantity}, have ${product.stock}`);
    }
  }
}

async function handleOrderCompleted(order) {
  console.log(`[Inventory] Order ${order.orderId} completed — releasing reservations`);
  for (const item of order.items) {
    const product = stockDb[item.productId];
    if (product) {
      product.reserved = Math.max(0, product.reserved - item.quantity);
    }
  }
}

async function handleOrderCancelled(order) {
  console.log(`[Inventory] Order ${order.orderId} cancelled — restoring stock`);
  for (const item of order.items) {
    const product = stockDb[item.productId];
    if (product) {
      product.stock += item.quantity;
      product.reserved = Math.max(0, product.reserved - item.quantity);

      await producer.send({
        topic: 'inventory.warehouse.stock-updated',
        messages: [{
          key: item.productId,
          value: JSON.stringify({
            productId: item.productId,
            productName: product.name,
            previousStock: product.stock - item.quantity,
            newStock: product.stock,
            reason: 'order_cancelled',
            orderId: order.orderId,
            warehouse: product.warehouse,
            updatedAt: new Date().toISOString(),
          }),
          headers: {
            'event-type': 'stock-updated',
            'source': 'inventory-service',
          },
        }],
      });

      console.log(`  Restored: ${product.name} +${item.quantity} (now: ${product.stock})`);
    }
  }
}

// --- Producer: Periodic stock reports ---

async function produceStockReports() {
  await producer.connect();
  console.log('[Inventory Service] Producer connected to', BROKER);

  // Publish stock snapshot every 30 seconds
  setInterval(async () => {
    const report = Object.entries(stockDb).map(([id, data]) => ({
      productId: id,
      productName: data.name,
      stock: data.stock,
      reserved: data.reserved,
      available: data.stock - data.reserved,
      warehouse: data.warehouse,
    }));

    await producer.send({
      topic: 'inventory.warehouse.stock-updated',
      messages: [{
        key: 'stock-snapshot',
        value: JSON.stringify({
          type: 'snapshot',
          timestamp: new Date().toISOString(),
          products: report,
          totalProducts: report.length,
          lowStockCount: report.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).length,
        }),
        headers: {
          'event-type': 'stock-snapshot',
          'source': 'inventory-service',
        },
      }],
    });

    console.log(`\n[Inventory] Stock snapshot published (${report.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length} low stock items)`);
  }, 30000);
}

// --- Main ---

async function main() {
  console.log('===========================================');
  console.log('  Inventory Service - Mock Application');
  console.log('===========================================');
  console.log(`Kafka Broker: ${BROKER}`);
  console.log(`Tracking ${Object.keys(stockDb).length} products`);
  console.log(`Low stock threshold: ${LOW_STOCK_THRESHOLD} units`);
  console.log('');

  await produceStockReports();
  await consumeOrderEvents();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n[Inventory Service] Shutting down...');
  console.log('Final stock levels:');
  Object.entries(stockDb).forEach(([id, data]) => {
    console.log(`  ${id} ${data.name}: ${data.stock} (reserved: ${data.reserved})`);
  });
  await producer.disconnect();
  await consumer.disconnect();
  process.exit(0);
});
