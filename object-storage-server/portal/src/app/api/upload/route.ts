export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getMinioClient } from '@/lib/minio';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string | null;
    const prefix = (formData.get('prefix') as string) || '';

    if (!file || !bucket) {
      return NextResponse.json({ error: 'File and bucket required' }, { status: 400 });
    }

    const client = getMinioClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const objectName = prefix ? `${prefix}${file.name}` : file.name;

    await client.putObject(bucket, objectName, buffer, buffer.length, {
      'Content-Type': file.type || 'application/octet-stream',
    });

    return NextResponse.json({
      success: true,
      bucket,
      object: objectName,
      size: buffer.length,
    });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
