/**
 * Media Service Mock App
 * Demonstrates: image upload, thumbnail simulation, public share links
 */
const Minio = require('minio');
const crypto = require('crypto');

const BUCKET = 'media-svc';
const client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'media-svc-key',
  secretKey: process.env.MINIO_SECRET_KEY || 'media-svc-secret',
});

function generateFakeImage(width, height, label) {
  // Generate a simple SVG as a fake image
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#${crypto.randomBytes(3).toString('hex')}"/>
    <text x="50%" y="50%" text-anchor="middle" fill="white" font-size="20">${label}</text>
  </svg>`);
}

async function main() {
  console.log('=== Media Service Demo ===\n');

  // 1. Upload "images"
  const images = [
    { name: 'avatars/user-001.svg', label: 'User 1' },
    { name: 'avatars/user-002.svg', label: 'User 2' },
    { name: 'videos/intro.svg', label: 'Intro Video' },
    { name: 'thumbnails/thumb-001.svg', label: 'Thumb' },
  ];

  for (const img of images) {
    const data = generateFakeImage(200, 200, img.label);
    await client.putObject(BUCKET, img.name, data, data.length, { 'Content-Type': 'image/svg+xml' });
    console.log(`  Uploaded: ${img.name} (${data.length} bytes)`);
  }

  // 2. Generate thumbnail (simulate by uploading smaller version)
  const original = generateFakeImage(800, 600, 'Photo');
  await client.putObject(BUCKET, 'photos/sunset.svg', original, original.length, { 'Content-Type': 'image/svg+xml' });
  console.log('\n  Uploaded original: photos/sunset.svg');

  const thumb = generateFakeImage(150, 112, 'Thumb');
  await client.putObject(BUCKET, 'thumbnails/sunset-thumb.svg', thumb, thumb.length, { 'Content-Type': 'image/svg+xml' });
  console.log('  Generated thumbnail: thumbnails/sunset-thumb.svg');

  // 3. List all media
  console.log('\n  --- All Media ---');
  const stream = client.listObjectsV2(BUCKET, '', true);
  for await (const obj of stream) {
    console.log(`  ${obj.name} (${obj.size} bytes)`);
  }

  // 4. Generate public share link (7 days)
  const shareUrl = await client.presignedGetObject(BUCKET, 'photos/sunset.svg', 604800);
  console.log(`\n  Public link (7d): ${shareUrl}`);

  // 5. Upload to temp (will auto-delete after 7 days via lifecycle rule)
  const tempData = Buffer.from('temporary processing file');
  await client.putObject(BUCKET, 'tmp/processing-job-123.dat', tempData);
  console.log('  Uploaded temp file: tmp/processing-job-123.dat (auto-deletes in 7 days)');

  // 6. Try accessing document-svc bucket (should fail)
  try {
    await client.listObjectsV2('document-svc', '', true).next();
    console.log('\n  ERROR: Should not have access to document-svc!');
  } catch (err) {
    console.log(`\n  Access to document-svc blocked (as expected): ${err.code}`);
  }

  console.log('\n=== Media Service Demo Complete ===');
}

main().catch(console.error);
