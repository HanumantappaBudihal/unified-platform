export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getRedisCluster, scanKeys } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern') || '*';

    const redis = getRedisCluster();
    const matchedKeys = await scanKeys(pattern);

    const keys = await Promise.all(
      matchedKeys.map(async (key) => {
        const [type, ttl, value] = await Promise.all([
          redis.type(key),
          redis.ttl(key),
          redis.get(key).catch(() => null),
        ]);
        return {
          key,
          type,
          ttl,
          value: value && value.length > 500 ? value.substring(0, 500) : value,
        };
      })
    );

    return NextResponse.json({ keys });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch keys: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, ttl } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'key and value are required' },
        { status: 400 }
      );
    }

    const redis = getRedisCluster();

    if (ttl && ttl > 0) {
      await redis.set(key, value, 'EX', ttl);
    } else {
      await redis.set(key, value);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to set key: ${error}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'key query param is required' },
        { status: 400 }
      );
    }

    const redis = getRedisCluster();
    await redis.del(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to delete key: ${error}` },
      { status: 500 }
    );
  }
}
