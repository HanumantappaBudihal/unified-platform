const Minio = require('minio');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');
const config = require('../config');

const execFileAsync = promisify(execFile);

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

// The `minio` npm SDK only covers the S3 data API — creating users/policies and
// setting quotas requires the MinIO *admin* API, which the SDK does not expose.
// We drive those through the `mc` client (installed in the image). MC_HOST_<alias>
// configures the target statelessly, so there is no persistent alias to manage.
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
    const out = `${e.stdout || ''}${e.stderr || ''}${e.message || ''}`;
    // Some operations are idempotent only by tolerating "already exists" style errors.
    if (ignore.some(token => out.toLowerCase().includes(token))) return out;
    throw new Error(`mc ${args[0]} ${args[1] || ''} failed: ${out.trim()}`);
  }
}

async function provision(appSlug, environment = 'dev') {
  const bucketName = `${environment}-${appSlug}`;
  const accessKey = `${appSlug}-${environment}-key`;
  const secretKey = generateSecret();
  const policyName = `${appSlug}-${environment}-policy`;
  const client = getClient();

  // 1. Bucket + versioning (S3 data API — handled by the SDK).
  const exists = await client.bucketExists(bucketName);
  if (!exists) {
    await client.makeBucket(bucketName);
  }
  await client.setBucketVersioning(bucketName, { Status: 'Enabled' });

  // 2. Canned IAM policy scoped to this app's bucket (+ read-only shared bucket).
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

  const policyFile = path.join(os.tmpdir(), `${policyName}-${crypto.randomBytes(4).toString('hex')}.json`);
  await fs.writeFile(policyFile, JSON.stringify(policy));

  try {
    // Create/overwrite the policy.
    await mc(['admin', 'policy', 'create', 'idp', policyName, policyFile], {
      ignore: ['already exists'],
    });

    // 3. Create the per-app user with the generated credentials.
    await mc(['admin', 'user', 'add', 'idp', accessKey, secretKey]);

    // 4. Attach the policy to the user.
    await mc(['admin', 'policy', 'attach', 'idp', policyName, '--user', accessKey], {
      ignore: ['already', 'policy change is already in effect'],
    });
  } finally {
    await fs.unlink(policyFile).catch(() => {});
  }

  // 5. Bucket quota (10 GiB) — best-effort; mc command/flags vary by version.
  let quota = null;
  try {
    await mc(['quota', 'set', `idp/${bucketName}`, '--size', '10gib']);
    quota = '10GiB';
  } catch (e) {
    // Non-fatal: the bucket and credentials are valid without a quota.
    console.warn(`MinIO quota not set for ${bucketName}: ${e.message}`);
  }

  return {
    config: {
      bucket: bucketName,
      endpoint: `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endPoint}:${config.minio.port}`,
      policy: policyName,
      quota,
    },
    credentials: {
      accessKey,
      secretKey,
      bucket: bucketName,
      endpoint: `${config.minio.useSSL ? 'https' : 'http'}://${config.minio.endPoint}:${config.minio.port}`,
    },
  };
}

async function deprovision(appSlug, environment = 'dev') {
  const bucketName = `${environment}-${appSlug}`;
  const accessKey = `${appSlug}-${environment}-key`;
  const policyName = `${appSlug}-${environment}-policy`;
  const client = getClient();

  // Remove the user + policy (admin API). Tolerate "not found" so teardown is idempotent.
  await mc(['admin', 'user', 'remove', 'idp', accessKey], { ignore: ['not exist', 'not found', 'no such'] }).catch(() => {});
  await mc(['admin', 'policy', 'remove', 'idp', policyName], { ignore: ['not exist', 'not found', 'no such'] }).catch(() => {});

  // Empty + drop the bucket (S3 data API).
  try {
    const exists = await client.bucketExists(bucketName);
    if (exists) {
      // The bucket has versioning enabled, so every object (and delete marker)
      // must be removed by versionId before the bucket can be dropped.
      const objects = [];
      const stream = client.listObjects(bucketName, '', true, { IncludeVersion: true });
      for await (const obj of stream) {
        objects.push({ name: obj.name, versionId: obj.versionId });
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
