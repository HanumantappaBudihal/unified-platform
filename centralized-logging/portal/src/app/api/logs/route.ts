import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('query') || '{job="docker"}';
  const range = searchParams.get('range') || '1h';
  const limit = searchParams.get('limit') || '100';

  const rangeMs: Record<string, number> = {
    '1h': 3600000, '6h': 21600000, '12h': 43200000,
    '24h': 86400000, '7d': 604800000,
  };

  const end = Date.now() * 1000000;
  const start = (Date.now() - (rangeMs[range] || 3600000)) * 1000000;

  try {
    const params = new URLSearchParams({
      query, start: start.toString(), end: end.toString(),
      limit, direction: 'backward',
    });
    const res = await fetch(lokiUrl + '/loki/api/v1/query_range?' + params, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ entries: [], error: text }, { status: res.status });
    }
    const data = await res.json();
    const entries: { timestamp: string; level: string; service: string; message: string }[] = [];

    for (const result of data.data?.result || []) {
      const service = result.stream?.compose_service || result.stream?.container || 'unknown';
      for (const [ts, line] of result.values || []) {
        const date = new Date(Number(ts) / 1000000);
        let level = 'info';
        const lower = line.toLowerCase();
        if (lower.includes('error') || lower.includes('fatal')) level = 'error';
        else if (lower.includes('warn')) level = 'warn';
        else if (lower.includes('debug')) level = 'debug';
        entries.push({ timestamp: date.toISOString(), level, service, message: line });
      }
    }
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ entries: [], error: error instanceof Error ? error.message : 'Failed to query Loki' }, { status: 500 });
  }
}
