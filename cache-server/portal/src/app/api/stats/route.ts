export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getAllNodesInfo } from '@/lib/redis';

export async function GET() {
  try {
    const nodes = await getAllNodesInfo();

    const stats = nodes.reduce(
      (acc, node) => {
        acc.totalMemoryUsed += node.usedMemory ?? 0;
        acc.totalMemoryAvailable += node.maxMemory ?? 0;
        acc.opsPerSec += node.opsPerSec ?? 0;
        acc.totalHits += node.keyspaceHits ?? 0;
        acc.totalMisses += node.keyspaceMisses ?? 0;
        acc.keyCount += 0;
        acc.connectedClients += node.connectedClients ?? 0;
        return acc;
      },
      {
        totalMemoryUsed: 0,
        totalMemoryAvailable: 0,
        opsPerSec: 0,
        totalHits: 0,
        totalMisses: 0,
        keyCount: 0,
        connectedClients: 0,
      }
    );

    const totalRequests = stats.totalHits + stats.totalMisses;
    const hitRatio = totalRequests > 0 ? stats.totalHits / totalRequests : 0;

    return NextResponse.json({
      totalMemoryUsed: stats.totalMemoryUsed,
      totalMemoryAvailable: stats.totalMemoryAvailable,
      opsPerSec: stats.opsPerSec,
      hitRatio,
      keyCount: stats.keyCount,
      connectedClients: stats.connectedClients,
      nodeCount: nodes.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch stats: ${error}` },
      { status: 500 }
    );
  }
}
