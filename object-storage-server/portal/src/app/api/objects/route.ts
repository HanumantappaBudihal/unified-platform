export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { listObjects, deleteObject } from '@/lib/minio';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');
    const prefix = searchParams.get('prefix') || '';

    if (!bucket) return NextResponse.json({ error: 'Bucket name required' }, { status: 400 });

    const objects = await listObjects(bucket, prefix);
    return NextResponse.json({ bucket, prefix, objects });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { bucket, object } = await request.json();
    if (!bucket || !object) return NextResponse.json({ error: 'Bucket and object required' }, { status: 400 });

    await deleteObject(bucket, object);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
