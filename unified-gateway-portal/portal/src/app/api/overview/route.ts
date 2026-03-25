export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

async function fetchJson(url: string): Promise<any> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  const [kafkaTopics, kafkaBrokers, redisStats, minioStats] = await Promise.all([
    fetchJson(`${config.portals.kafka}/api/topics`),
    fetchJson(`${config.portals.kafka}/api/brokers`),
    fetchJson(`${config.portals.redis}/api/stats`),
    fetchJson(`${config.portals.minio}/api/stats`),
  ]);

  const kafka = kafkaTopics
    ? {
        status: 'online',
        topics: Array.isArray(kafkaTopics) ? kafkaTopics.length : kafkaTopics?.topics?.length ?? 0,
        brokers: kafkaBrokers?.brokers?.length ?? kafkaBrokers?.length ?? 0,
      }
    : { status: 'offline' };

  const redis = redisStats
    ? {
        status: 'online',
        nodeCount: redisStats.nodeCount ?? 0,
        opsPerSec: redisStats.opsPerSec ?? 0,
        totalMemoryUsed: redisStats.totalMemoryUsed ?? 0,
        totalMemoryAvailable: redisStats.totalMemoryAvailable ?? 0,
        hitRatio: redisStats.hitRatio ?? 0,
        connectedClients: redisStats.connectedClients ?? 0,
      }
    : { status: 'offline' };

  const minio = minioStats
    ? {
        status: 'online',
        bucketCount: minioStats.bucketCount ?? 0,
        totalObjects: minioStats.totalObjects ?? 0,
        totalSize: minioStats.totalSize ?? 0,
      }
    : { status: 'offline' };

  return NextResponse.json({ kafka, redis, minio });
}
