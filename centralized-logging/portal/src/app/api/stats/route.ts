import { NextResponse } from 'next/server';

export async function GET() {
  const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';

  const stats = {
    totalLogs: 0, errorCount: 0, warningCount: 0, activeStreams: 0,
    topServices: [] as { name: string; count: number }[],
    recentErrors: [] as { timestamp: string; service: string; message: string }[],
  };

  try {
    const end = Date.now() * 1000000;
    const start24h = (Date.now() - 86400000) * 1000000;

    const [seriesRes, errorsRes] = await Promise.all([
      fetch(lokiUrl + '/loki/api/v1/series?' + new URLSearchParams({ match: '{job="docker"}', start: start24h.toString(), end: end.toString() }), { cache: 'no-store' }).catch(() => null),
      fetch(lokiUrl + '/loki/api/v1/query_range?' + new URLSearchParams({ query: '{job="docker"} |= "error"', start: start24h.toString(), end: end.toString(), limit: '20', direction: 'backward' }), { cache: 'no-store' }).catch(() => null),
    ]);

    if (seriesRes?.ok) {
      const seriesData = await seriesRes.json();
      stats.activeStreams = (seriesData.data || []).length;
      const svcCounts: Record<string, number> = {};
      for (const labels of seriesData.data || []) {
        const svc = labels.compose_service || labels.container || 'unknown';
        svcCounts[svc] = (svcCounts[svc] || 0) + 1;
      }
      stats.topServices = Object.entries(svcCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    }

    if (errorsRes?.ok) {
      const errData = await errorsRes.json();
      for (const result of errData.data?.result || []) {
        const service = result.stream?.compose_service || result.stream?.container || 'unknown';
        for (const [ts, line] of result.values || []) {
          stats.errorCount++;
          if (stats.recentErrors.length < 10) {
            stats.recentErrors.push({
              timestamp: new Date(Number(ts) / 1000000).toISOString(),
              service, message: line.substring(0, 200),
            });
          }
        }
      }
    }

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json(stats);
  }
}
