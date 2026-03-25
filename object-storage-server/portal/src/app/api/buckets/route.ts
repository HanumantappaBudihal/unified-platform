export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { listBuckets, getMinioClient } from '@/lib/minio';

export async function GET() {
  try {
    const buckets = await listBuckets();
    return NextResponse.json(buckets);
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, versioning } = await request.json();
    if (!name) return NextResponse.json({ error: 'Bucket name required' }, { status: 400 });

    const client = getMinioClient();
    await client.makeBucket(name);

    if (versioning) {
      await client.setBucketVersioning(name, { Status: 'Enabled' });
    }

    return NextResponse.json({ success: true, bucket: name });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
