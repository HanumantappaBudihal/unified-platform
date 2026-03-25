export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const serviceMap: Record<string, string> = {
  console: config.internal.minioConsole,
  grafana: config.internal.grafana,
  prometheus: config.internal.prometheus,
  alertmanager: config.internal.alertmanager,
};

export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get('service');
  const path = request.nextUrl.searchParams.get('path') || '/';

  if (!service || !serviceMap[service]) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
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
