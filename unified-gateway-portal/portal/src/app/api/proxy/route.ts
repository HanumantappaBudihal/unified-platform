export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const serviceMap: Record<string, string> = {
  'kafka-portal': config.portals.kafka,
  'cache-portal': config.portals.redis,
  'storage-portal': config.portals.minio,
  'kafka-ui': config.tools.kafkaUi,
  'redis-insight': config.tools.redisInsight,
  'minio-console': config.tools.minioConsole,
  'grafana-kafka': config.monitoring.kafkaGrafana,
  'grafana-cache': config.monitoring.redisGrafana,
  'grafana-storage': config.monitoring.minioGrafana,
};

export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get('service');
  const path = request.nextUrl.searchParams.get('path') || '/';

  if (!service || !serviceMap[service]) {
    return NextResponse.json({ error: 'Invalid service', available: Object.keys(serviceMap) }, { status: 400 });
  }

  try {
    const targetUrl = `${serviceMap[service]}${path}`;
    const resp = await fetch(targetUrl);
    const contentType = resp.headers.get('content-type') || 'text/html';

    if (contentType.includes('text/html')) {
      const html = await resp.text();
      return new NextResponse(html, { headers: { 'content-type': contentType } });
    }

    const body = await resp.arrayBuffer();
    return new NextResponse(body, { headers: { 'content-type': contentType } });
  } catch (error) {
    return NextResponse.json({ error: `Proxy error: ${error}` }, { status: 502 });
  }
}
