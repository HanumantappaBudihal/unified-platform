import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const path = searchParams.get('path') || '/';
  const kumaUrl = process.env.UPTIME_KUMA_URL || 'http://localhost:3010';

  try {
    const res = await fetch(kumaUrl + path, { cache: 'no-store' });
    const data = await res.text();
    return new NextResponse(data, { status: res.status, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Proxy error' }, { status: 502 });
  }
}
