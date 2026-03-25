import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const target = searchParams.get('target') || 'loki';
  const path = searchParams.get('path') || '/';

  const urls: Record<string, string> = {
    loki: process.env.LOKI_URL || 'http://localhost:3100',
    grafana: process.env.GRAFANA_URL || 'http://localhost:3008',
  };

  const baseUrl = urls[target];
  if (!baseUrl) return NextResponse.json({ error: 'Invalid target' }, { status: 400 });

  try {
    const res = await fetch(baseUrl + path, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Proxy error' }, { status: 502 });
  }
}
