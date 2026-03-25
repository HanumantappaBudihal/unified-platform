/**
 * Document Service Mock App
 * Demonstrates: upload, download, versioning, presigned URLs
 */
const Minio = require('minio');

const BUCKET = 'document-svc';
const client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'document-svc-key',
  secretKey: process.env.MINIO_SECRET_KEY || 'document-svc-secret',
});

async function main() {
  console.log('=== Document Service Demo ===\n');

  // 1. Upload documents
  const docs = [
    { name: 'invoices/invoice-001.txt', content: 'Invoice #001 - Amount: $1,500.00' },
    { name: 'invoices/invoice-002.txt', content: 'Invoice #002 - Amount: $2,300.00' },
    { name: 'contracts/contract-2024.txt', content: 'Service Agreement - Effective Date: 2024-01-01' },
    { name: 'reports/q1-report.txt', content: 'Q1 Revenue: $150,000 | Expenses: $95,000 | Profit: $55,000' },
  ];

  for (const doc of docs) {
    await client.putObject(BUCKET, doc.name, Buffer.from(doc.content));
    console.log(`  Uploaded: ${doc.name}`);
  }

  // 2. Update a document (creates new version)
  await client.putObject(BUCKET, 'invoices/invoice-001.txt', Buffer.from('Invoice #001 - Amount: $1,750.00 (REVISED)'));
  console.log('\n  Updated: invoices/invoice-001.txt (new version)');

  // 3. List all documents
  console.log('\n  --- All Documents ---');
  const stream = client.listObjectsV2(BUCKET, '', true);
  for await (const obj of stream) {
    console.log(`  ${obj.name} (${obj.size} bytes)`);
  }

  // 4. Generate presigned URL
  const shareUrl = await client.presignedGetObject(BUCKET, 'reports/q1-report.txt', 3600);
  console.log(`\n  Share link (1h): ${shareUrl}`);

  // 5. Download and read
  const dataStream = await client.getObject(BUCKET, 'invoices/invoice-001.txt');
  let content = '';
  for await (const chunk of dataStream) content += chunk;
  console.log(`\n  Read invoice-001: "${content}"`);

  // 6. Try accessing another bucket (should fail)
  try {
    await client.listObjectsV2('media-svc', '', true).next();
    console.log('\n  ERROR: Should not have access to media-svc!');
  } catch (err) {
    console.log(`\n  Access to media-svc blocked (as expected): ${err.code}`);
  }

  console.log('\n=== Document Service Demo Complete ===');
}

main().catch(console.error);
