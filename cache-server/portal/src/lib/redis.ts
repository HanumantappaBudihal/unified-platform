import Redis, { Cluster } from 'ioredis';
import { config } from './config';

let clusterInstance: Cluster | null = null;

export function getRedisCluster(): Cluster {
  if (!clusterInstance) {
    // Build natMap to translate Docker hostnames to localhost when running outside Docker
    const natMap: Record<string, { host: string; port: number }> = {};
    for (let i = 1; i <= 6; i++) {
      const port = 6370 + i;
      natMap[`redis-node-${i}:${port}`] = { host: config.redis.nodes[0]?.host || 'localhost', port };
    }

    clusterInstance = new Redis.Cluster(config.redis.nodes, {
      redisOptions: {
        username: config.redis.username,
        password: config.redis.password,
      },
      natMap,
      clusterRetryStrategy: (times: number) => Math.min(times * 100, 3000),
    });
  }
  return clusterInstance;
}

export async function getClusterInfo(): Promise<Record<string, string>> {
  const redis = getRedisCluster();
  const nodes = redis.nodes('master');
  if (nodes.length === 0) return {};

  const info = await nodes[0].call('CLUSTER', 'INFO') as string;
  const result: Record<string, string> = {};
  info.split('\r\n').forEach((line) => {
    const [key, value] = line.split(':');
    if (key && value) result[key] = value;
  });
  return result;
}

export async function getNodeInfo(node: any): Promise<Record<string, string>> {
  const raw = await node.call('INFO', 'all') as string;
  const result: Record<string, string> = {};
  raw.split('\r\n').forEach((line) => {
    if (line.startsWith('#') || !line.includes(':')) return;
    const [key, value] = line.split(':');
    if (key && value) result[key] = value;
  });
  return result;
}

export async function getAllNodesInfo() {
  const redis = getRedisCluster();
  const masters = redis.nodes('master');
  const replicas = redis.nodes('slave');
  const allNodes = [...masters, ...replicas];

  const infos = await Promise.all(
    allNodes.map(async (node) => {
      try {
        const info = await getNodeInfo(node);
        const opts = node.options;
        return {
          host: opts.host || 'unknown',
          port: opts.port || 0,
          role: info.role || 'unknown',
          usedMemory: parseInt(info.used_memory || '0', 10),
          maxMemory: parseInt(info.maxmemory || '0', 10),
          connectedClients: parseInt(info.connected_clients || '0', 10),
          opsPerSec: parseInt(info.instantaneous_ops_per_sec || '0', 10),
          keyspaceHits: parseInt(info.keyspace_hits || '0', 10),
          keyspaceMisses: parseInt(info.keyspace_misses || '0', 10),
          uptimeSeconds: parseInt(info.uptime_in_seconds || '0', 10),
          version: info.redis_version || 'unknown',
          status: 'up' as const,
        };
      } catch {
        const opts = node.options;
        return {
          host: opts.host || 'unknown',
          port: opts.port || 0,
          role: 'unknown',
          usedMemory: 0,
          maxMemory: 0,
          connectedClients: 0,
          opsPerSec: 0,
          keyspaceHits: 0,
          keyspaceMisses: 0,
          uptimeSeconds: 0,
          version: 'unknown',
          status: 'down' as const,
        };
      }
    })
  );
  return infos;
}

export async function scanKeys(pattern: string, count: number = 100): Promise<string[]> {
  const redis = getRedisCluster();
  const masters = redis.nodes('master');
  const allKeys: string[] = [];

  for (const node of masters) {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await node.call('SCAN', cursor, 'MATCH', pattern, 'COUNT', '100') as [string, string[]];
      cursor = nextCursor;
      allKeys.push(...keys);
      if (allKeys.length >= count) break;
    } while (cursor !== '0');
    if (allKeys.length >= count) break;
  }

  return allKeys.slice(0, count);
}
