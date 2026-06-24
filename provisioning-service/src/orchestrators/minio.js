'use strict';

const Minio = require('minio');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const config = require('../config');

const execFileAsync = promisify(execFile);

// Provisions a per-app bucket `<env>-<slug>` plus a least-privilege MinIO
// service account scoped to that bucket. Bucket creation uses the S3 SDK; the
// IAM bits (policy + service account) use the `mc` admin client, because the
// `minio` npm SDK only covers the S3 data API, not the admin API. `mc` is
// configured statelessly via the MC_HOST_<alias> env var — no persistent alias.

function generateSecret() {
  return crypto.randomBytes(32).toString('base64url');
}

function s3Client() {
  return new Minio.Client({
    endPoint: config.minio.endPoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });
}

function mcEnv() {
  const scheme = config.minio.useSSL ? 'https' : 'http';
  const creds = `${encodeURIComponent(config.minio.accessKey)}:${encodeURIComponent(config.minio.secretKey)}`;
  return {
    ...process.env,
    MC_HOST_idp: `${scheme}://${creds}@${config.minio.endPoint}:${config.minio.port}`,
  };
}

async function mc(args, { ignore = [] } = {}) {
  try {
    const { stdout } = await execFileAsync('mc', args, { env: mcEnv() });
    return stdout;
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}${e.message || ''}`.toLowerCase();
    if (ignore.some((token) => out.includes(token))) return out;
    throw new Error(`mc ${args.slice(0, 2).join(' ')} failed: ${out.trim()}`);
  }
}

function bucketPolicy(bucket) {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
        Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
      },
    ],
  });
}

async function provision(slug, environment) {
  const bucket = `${environment}-${slug}`;
  const policyName = `${slug}-${environment}-policy`;
  const accessKey = `${slug}-${environment}-key`;
  const secretKey = generateSecret();

  // 1. Bucket (idempotent).
  const s3 = s3Client();
  const exists = await s3.bucketExists(bucket).catch(() => false);
  if (!exists) await s3.makeBucket(bucket);

  // 2. Scoped policy. `mc admin policy create` is idempotent-ish; tolerate the
  //    "already exists" case by re-creating from the temp doc on stdin.
  const policyDoc = bucketPolicy(bucket);
  await mc(['admin', 'policy', 'create', 'idp', policyName, '/dev/stdin'], { ignore: ['already'] })
    .catch(async () => {
      // Fallback for mc versions that won't read /dev/stdin: write via env file.
      const tmp = `${require('os').tmpdir()}/${policyName}.json`;
      await require('fs/promises').writeFile(tmp, policyDoc);
      await mc(['admin', 'policy', 'create', 'idp', policyName, tmp], { ignore: ['already'] });
      await require('fs/promises').unlink(tmp).catch(() => {});
    });

  // 3. Service account with the bucket-scoped policy attached.
  await mc([
    'admin', 'user', 'svcacct', 'add', 'idp', config.minio.accessKey,
    '--access-key', accessKey,
    '--secret-key', secretKey,
    '--policy', policyName,
  ], { ignore: ['already exists'] });

  return {
    config: { bucket, policy: policyName, endpoint: `${config.minio.endPoint}:${config.minio.port}` },
    credentials: { accessKey, secretKey, bucket },
  };
}

async function decommission(slug, environment) {
  const bucket = `${environment}-${slug}`;
  const policyName = `${slug}-${environment}-policy`;
  const accessKey = `${slug}-${environment}-key`;

  await mc(['admin', 'user', 'svcacct', 'rm', 'idp', accessKey], { ignore: ['not', 'does not'] });
  await mc(['admin', 'policy', 'rm', 'idp', policyName], { ignore: ['not', 'does not'] });
  // Bucket contents are intentionally NOT deleted here — data removal is an
  // explicit, separate operation to avoid accidental loss on decommission.
  return { removed: { policy: policyName, accessKey }, bucketRetained: bucket };
}

module.exports = { provision, decommission };
