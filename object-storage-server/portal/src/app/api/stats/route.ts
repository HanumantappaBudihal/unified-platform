export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { listBuckets } from '@/lib/minio';

export async function GET() {
  try {
    const buckets = await listBuckets();

    const totalObjects = buckets.reduce((sum, b) => sum + b.objectCount, 0);
    const totalSize = buckets.reduce((sum, b) => sum + b.totalSize, 0);

    return NextResponse.json({
      bucketCount: buckets.length,
      totalObjects,
      totalSize,
      buckets: buckets.map((b) => ({
        name: b.name,
        objectCount: b.objectCount,
        totalSize: b.totalSize,
        versioning: b.versioning,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch stats: ${error}` }, { status: 500 });
  }
}
