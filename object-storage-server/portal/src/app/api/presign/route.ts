export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/minio';

export async function POST(request: Request) {
  try {
    const { bucket, object, expiry = 3600 } = await request.json();
    if (!bucket || !object) return NextResponse.json({ error: 'Bucket and object required' }, { status: 400 });

    const url = await getPresignedUrl(bucket, object, expiry);
    return NextResponse.json({ url, expiry });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
