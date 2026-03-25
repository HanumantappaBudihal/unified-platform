export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getMinioClient } from '@/lib/minio';

export async function GET() {
  try {
    const client = getMinioClient();
    await client.listBuckets();
    return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: `${error}` }, { status: 500 });
  }
}
