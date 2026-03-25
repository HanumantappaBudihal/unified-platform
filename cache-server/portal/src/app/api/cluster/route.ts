export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getRedisCluster, getAllNodesInfo } from '@/lib/redis';

export async function GET() {
  try {
    const redis = getRedisCluster();
    const clusterInfoRaw: string = await redis.call('CLUSTER', 'INFO') as string;

    const clusterState = clusterInfoRaw
      .split('\r\n')
      .find(line => line.startsWith('cluster_state:'))
      ?.split(':')[1]
      ?.trim() ?? 'unknown';

    const nodes = await getAllNodesInfo();

    return NextResponse.json({ clusterState, nodes });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch cluster info: ${error}` },
      { status: 500 }
    );
  }
}
