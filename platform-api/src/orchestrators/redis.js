const Redis = require('ioredis');
const config = require('../config');
const crypto = require('crypto');

function generatePassword() {
  return crypto.randomBytes(24).toString('base64url');
}

function getRedisClient() {
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  });
}

async function provision(appSlug, environment = 'dev') {
  const aclUser = `${appSlug}-${environment}-svc`;
  const keyPrefix = `${environment}:${appSlug}:`;
  const password = generatePassword();

  const redis = getRedisClient();

  try {
    // Create ACL user with key prefix isolation
    // ~prefix:* restricts key access, &prefix:* restricts pub/sub channels
    await redis.call(
      'ACL', 'SETUSER', aclUser,
      'on',
      `>${password}`,
      `~${keyPrefix}*`,
      `&${keyPrefix}*`,
      '+@all', '-@admin', '-@dangerous'
    );

    // Persist ACL to disk
    await redis.call('ACL', 'SAVE');

    // Propagate to all cluster nodes
    const nodes = await redis.call('CLUSTER', 'NODES');
    const masterLines = nodes.split('\n').filter(l => l.includes('master') && !l.includes('fail'));

    for (const line of masterLines) {
      const parts = line.split(' ');
      const [host, port] = parts[1].split('@')[0].split(':');
      if (host === config.redis.host && parseInt(port) === config.redis.port) continue;

      const nodeClient = new Redis({ host, port: parseInt(port), password: config.redis.password });
      try {
        await nodeClient.call(
          'ACL', 'SETUSER', aclUser,
          'on', `>${password}`,
          `~${keyPrefix}*`, `&${keyPrefix}*`,
          '+@all', '-@admin', '-@dangerous'
        );
        await nodeClient.call('ACL', 'SAVE');
      } catch (e) {
        // Non-fatal: ACL will sync on next restart
        console.warn(`Failed to sync ACL to ${host}:${port}: ${e.message}`);
      } finally {
        nodeClient.disconnect();
      }
    }

    return {
      config: { keyPrefix, user: aclUser, nodes: '6371,6372,6373' },
      credentials: { user: aclUser, password, keyPrefix },
    };
  } finally {
    redis.disconnect();
  }
}

async function deprovision(appSlug, environment = 'dev') {
  const aclUser = `${appSlug}-${environment}-svc`;
  const redis = getRedisClient();

  try {
    try {
      await redis.call('ACL', 'DELUSER', aclUser);
      await redis.call('ACL', 'SAVE');
    } catch (e) {
      if (!e.message.includes('not found')) throw e;
    }
  } finally {
    redis.disconnect();
  }
}

module.exports = { provision, deprovision };
