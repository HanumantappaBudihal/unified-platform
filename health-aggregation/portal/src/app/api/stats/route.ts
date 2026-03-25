import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3009';
    const res = await fetch(baseUrl + '/api/health', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        score: data.score,
        totalServices: data.summary.total,
        servicesUp: data.summary.healthy,
        servicesDown: data.summary.unhealthy,
        servers: data.servers.map((s: { name: string; status: string; responseTime: number }) => ({
          name: s.name, status: s.status, responseTime: s.responseTime,
        })),
      });
    }
  } catch { /* */ }
  return NextResponse.json({ score: 0, totalServices: 0, servicesUp: 0, servicesDown: 0, servers: [] });
}
