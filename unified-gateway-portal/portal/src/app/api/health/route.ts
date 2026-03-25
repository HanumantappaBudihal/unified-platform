export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

async function checkHealth(url: string): Promise<{ status: string; [key: string]: any }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { status: 'healthy', ...data };
    }
    return { status: 'unhealthy' };
  } catch {
    return { status: 'offline' };
  }
}

export async function GET() {
  const [kafka, redis, minio] = await Promise.all([
    checkHealth(config.portals.kafka),
    checkHealth(config.portals.redis),
    checkHealth(config.portals.minio),
  ]);

  return NextResponse.json({ kafka, redis, minio });
}
