'use strict';

const Redis = require('ioredis');
const crypto = require('crypto');
const config = require('../config');

// Provisions a per-app Redis ACL user scoped to a key prefix `<env>:<slug>:`.
// `~prefix:*` restricts key access and `&prefix:*` restricts pub/sub channels,
// giving each app hard isolation on the shared cluster. The ACL is propagated
// to every reachable master node so it survives slot ownership changes.

function generatePassword() {
  return crypto.randomBytes(24).toString('base64url');
}

function rootClient(host, port) {
  return new Redis({
    host: host || config.redis.host,
    port: port || config.redis.port,
    password: config.redis.password,
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });
}

// Apply `fn` to every master node in the cluster (falling back to the single
// node when CLUSTER is unavailable, e.g. standalone Redis).
async function forEachMaster(fn) {
  const root = rootClient();
  await root.connect();
  try {
    await fn(root, config.redis.host, config.redis.port);

    let nodes;
    try {
      nodes = await root.call('CLUSTER', 'NODES');
    } catch {
      return; // standalone — single node already handled
    }

    const masters = String(nodes)
      .split('\n')
      .filter((l) => l.includes('master') && !l.includes('fail'))
      .map((l) => l.split(' ')[1]?.split('@')[0])
      .filter(Boolean);

    for (const addr of masters) {
      const [host, portStr] = addr.split(':');
      const port = parseInt(portStr, 10);
      if (host === config.redis.host && port === config.redis.port) continue;
      const node = rootClient(host, port);
      try {
        await node.connect();
        await fn(node, host, port);
      } finally {
        node.disconnect();
      }
    }
  } finally {
    root.disconnect();
  }
}

async function provision(slug, environment) {
  const aclUser = `${slug}-${environment}-svc`;
  const keyPrefix = `${environment}:${slug}:`;
  const password = generatePassword();

  await forEachMaster(async (node) => {
    await node.call(
      'ACL', 'SETUSER', aclUser,
      'on', `>${password}`,
      `~${keyPrefix}*`, `&${keyPrefix}*`,
      '+@all', '-@admin', '-@dangerous'
    );
    // Best-effort persist; read-only aclfile mounts leave the user in memory.
    await node.call('ACL', 'SAVE').catch(() => {});
  });

  return {
    config: { aclUser, keyPrefix, host: config.redis.host, port: config.redis.port },
    credentials: { username: aclUser, password, keyPrefix },
  };
}

async function decommission(slug, environment) {
  const aclUser = `${slug}-${environment}-svc`;
  await forEachMaster(async (node) => {
    await node.call('ACL', 'DELUSER', aclUser).catch(() => {});
    await node.call('ACL', 'SAVE').catch(() => {});
  });
  return { removed: aclUser };
}

module.exports = { provision, decommission };
