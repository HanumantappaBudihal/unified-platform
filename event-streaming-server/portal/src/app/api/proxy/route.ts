import { NextRequest, NextResponse } from 'next/server';

const SERVICE_MAP: Record<string, string> = {
  'kafka-ui': process.env.KAFKA_UI_URL_INTERNAL || 'http://localhost:8080',
  'grafana': process.env.GRAFANA_URL_INTERNAL || 'http://localhost:3000',
  'prometheus': process.env.PROMETHEUS_URL_INTERNAL || 'http://localhost:9090',
  'alertmanager': process.env.ALERTMANAGER_URL_INTERNAL || 'http://localhost:9094',
};

export async function GET(req: NextRequest) {
  const service = req.nextUrl.searchParams.get('service');
  const path = req.nextUrl.searchParams.get('path') || '/';

  if (!service || !SERVICE_MAP[service]) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
  }

  const targetUrl = `${SERVICE_MAP[service]}${path}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Accept': req.headers.get('accept') || '*/*',
        'Accept-Encoding': 'identity',
      },
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || 'text/html';
    const body = await res.arrayBuffer();

    // Rewrite URLs in HTML responses so sub-resources also go through the proxy
    if (contentType.includes('text/html')) {
      let html = new TextDecoder().decode(body);
      const base = SERVICE_MAP[service];

      // Inject a <base> tag so relative URLs resolve through the original service
      // But for CSS/JS we rewrite absolute paths to go through our proxy
      html = html.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${base}/" />`
      );

      return new NextResponse(html, {
        status: res.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
        },
      });
    }

    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': res.headers.get('cache-control') || 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: `Failed to reach ${service}` }, { status: 502 });
  }
}
