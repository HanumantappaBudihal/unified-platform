export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getRedisCluster } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, message } = body;

    if (!channel || !message) {
      return NextResponse.json(
        { error: 'channel and message are required' },
        { status: 400 }
      );
    }

    const redis = getRedisCluster();
    await redis.publish(channel, typeof message === 'string' ? message : JSON.stringify(message));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to publish message: ${error}` },
      { status: 500 }
    );
  }
}
