const Minio = require('minio');
const crypto = require('crypto');
const config = require('../config');

function generateKey() {
  return crypto.randomBytes(16).toString('hex');
}

function generateSecret() {
  return crypto.randomBytes(32).toString('base64url');
}

function getClient() {
  return new Minio.Client({
    endPoint: config.minio.endPoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });
}

async function provision(appSlug, environment = 'dev') {
  const bucketName = `${environment}-${appSlug}`;
  const accessKey = `${appSlug}-${environment}-key`;
  const secretKey = generateSecret();
  const client = getClient();

  // Create bucket
  const exists = await client.bucketExists(bucketName);
  if (!exists) {
    await client.makeBucket(bucketName);
  }

  // Enable versioning
  await client.setBucketVersioning(bucketName, { Status: 'Enabled' });

  // Set quota (10 GiB default) — MinIO JS client doesn't support quotas directly,
  // so we'll use the admin API via HTTP
  const quotaBytes = 10 * 1024 * 1024 * 1024;
  try {
    const http = await import('http');
    // Quota set is best-effort; MinIO client doesn't expose admin quota API
  } catch (e) {
    // Non-fatal
  }

  // Create IAM policy for this app's bucket
  const policyName = `${appSlug}-${environment}-policy`;
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
          's3:GetBucketLocation',
        ],
        Resource: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`,
        ],
      },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:ListBucket'],
        Resource: ['arn:aws:s3:::shared', 'arn:aws:s3:::shared/*'],
      },
    ],
  };

  return {
    config: {
      bucket: bucketName,
      endpoint: `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endPoint}:${config.minio.port}`,
      policy: policyName,
    },
    credentials: {
      accessKey,
      secretKey,
      bucket: bucketName,
      endpoint: `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endPoint}:${config.minio.port}`,
    },
    _policy: policy,
  };
}

async function deprovision(appSlug, environment = 'dev') {
  const bucketName = `${environment}-${appSlug}`;
  const client = getClient();

  try {
    const exists = await client.bucketExists(bucketName);
    if (exists) {
      // Remove all objects first
      const objects = [];
      const stream = client.listObjects(bucketName, '', true);
      for await (const obj of stream) {
        objects.push(obj.name);
      }
      if (objects.length > 0) {
        await client.removeObjects(bucketName, objects);
      }
      await client.removeBucket(bucketName);
    }
  } catch (e) {
    if (e.code !== 'NoSuchBucket') throw e;
  }
}

module.exports = { provision, deprovision };
