const { Kafka } = require('kafkajs');

const BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const kafka = new Kafka({
  clientId: 'orders-service',
  brokers: [BROKER],
  retry: { retries: 5, initialRetryTime: 1000 },
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'orders-service-group' });

// --- Mock Data Generators ---

const products = [
  { id: 'PROD-001', name: 'Wireless Headphones', price: 79.99 },
  { id: 'PROD-002', name: 'Mechanical Keyboard', price: 149.99 },
  { id: 'PROD-003', name: 'USB-C Hub', price: 49.99 },
  { id: 'PROD-004', name: '4K Monitor', price: 399.99 },
  { id: 'PROD-005', name: 'Ergonomic Mouse', price: 59.99 },
  { id: 'PROD-006', name: 'Laptop Stand', price: 34.99 },
  { id: 'PROD-007', name: 'Webcam HD', price: 89.99 },
  { id: 'PROD-008', name: 'Noise Cancelling Earbuds', price: 129.99 },
];

const customers = [
  { id: 'CUST-101', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 'CUST-102', name: 'Bob Smith', email: 'bob@example.com' },
  { id: 'CUST-103', name: 'Carol Davis', email: 'carol@example.com' },
  { id: 'CUST-104', name: 'David Wilson', email: 'david@example.com' },
  { id: 'CUST-105', name: 'Eve Martinez', email: 'eve@example.com' },
];

const paymentMethods = ['credit_card', 'debit_card', 'paypal', 'upi', 'bank_transfer'];
const statuses = ['created', 'completed', 'cancelled'];

let orderCounter = 1000;

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateOrder() {
  const customer = randomItem(customers);
  const itemCount = Math.floor(Math.random() * 3) + 1;
  const items = [];
  for (let i = 0; i < itemCount; i++) {
    const product = randomItem(products);
    const quantity = Math.floor(Math.random() * 3) + 1;
    items.push({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
      total: +(product.price * quantity).toFixed(2),
    });
  }

  const orderId = `ORD-${++orderCounter}`;
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  return {
    orderId,
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    items,
    subtotal,
    tax,
    total,
    currency: 'USD',
    paymentMethod: randomItem(paymentMethods),
    shippingAddress: {
      street: `${Math.floor(Math.random() * 9999) + 1} Main St`,
      city: randomItem(['New York', 'San Francisco', 'Austin', 'Seattle', 'Denver']),
      state: randomItem(['NY', 'CA', 'TX', 'WA', 'CO']),
      zip: String(Math.floor(Math.random() * 90000) + 10000),
    },
    createdAt: new Date().toISOString(),
  };
}

// --- Producer: Generate order events ---

async function produceOrders() {
  await producer.connect();
  console.log('[Orders Service] Producer connected to', BROKER);

  setInterval(async () => {
    try {
      const order = generateOrder();
      const status = randomItem(statuses);

      let topic;
      if (status === 'created') {
        topic = 'orders.checkout.order-created';
      } else if (status === 'completed') {
        topic = 'orders.checkout.order-completed';
        order.completedAt = new Date().toISOString();
        order.status = 'completed';
      } else {
        topic = 'orders.checkout.order-cancelled';
        order.cancelledAt = new Date().toISOString();
        order.status = 'cancelled';
        order.cancellationReason = randomItem([
          'customer_request', 'payment_failed', 'out_of_stock', 'fraud_detected',
        ]);
      }

      order.status = order.status || status;

      await producer.send({
        topic,
        messages: [{
          key: order.orderId,
          value: JSON.stringify(order),
          headers: {
            'event-type': status,
            'source': 'orders-service',
            'correlation-id': `corr-${Date.now()}`,
          },
        }],
      });

      console.log(`[Orders] Produced: ${order.orderId} -> ${topic} ($${order.total})`);
    } catch (err) {
      console.error('[Orders] Produce error:', err.message);
    }
  }, randomInterval());
}

// --- Consumer: Listen for inventory events ---

async function consumeInventoryEvents() {
  await consumer.connect();
  await consumer.subscribe({ topics: ['inventory.warehouse.stock-reserved', 'inventory.warehouse.low-stock-alert'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const value = JSON.parse(message.value.toString());
      if (topic === 'inventory.warehouse.stock-reserved') {
        console.log(`[Orders] Received stock reservation: ${value.productId} x${value.quantity} for order ${value.orderId}`);
      } else if (topic === 'inventory.warehouse.low-stock-alert') {
        console.log(`[Orders] LOW STOCK ALERT: ${value.productId} (${value.productName}) - only ${value.currentStock} left`);
      }
    },
  });

  console.log('[Orders Service] Consumer subscribed to inventory events');
}

function randomInterval() {
  return Math.floor(Math.random() * 4000) + 2000; // 2-6 seconds
}

// --- Main ---

async function main() {
  console.log('===========================================');
  console.log('  Orders Service - Mock Application');
  console.log('===========================================');
  console.log(`Kafka Broker: ${BROKER}`);
  console.log('');

  await produceOrders();
  await consumeInventoryEvents();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n[Orders Service] Shutting down...');
  await producer.disconnect();
  await consumer.disconnect();
  process.exit(0);
});
