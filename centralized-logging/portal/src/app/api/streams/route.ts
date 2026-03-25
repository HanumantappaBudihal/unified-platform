import { NextResponse } from 'next/server';

export async function GET() {
  const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';

  try {
    const end = Date.now() * 1000000;
    const start = (Date.now() - 3600000) * 1000000;
    const params = new URLSearchParams({
      match: '{job="docker"}',
      start: start.toString(),
      end: end.toString(),
    });
    const res = await fetch(lokiUrl + '/loki/api/v1/series?' + params, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    const streams = (data.data || []).map((labels: Record<string, string>) => ({
      labels,
      entries: 0,
      lastEntry: new Date().toISOString(),
    }));
    return NextResponse.json(streams);
  } catch {
    return NextResponse.json([]);
  }
}
