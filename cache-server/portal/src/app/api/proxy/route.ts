export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const SERVICE_MAP: Record<string, string> = {
  'redis-insight': config.internal.redisInsight,
  'grafana': config.internal.grafana,
  'prometheus': config.internal.prometheus,
  'alertmanager': config.internal.alertmanager,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const path = searchParams.get('path') || '/';

    if (!service) {
      return NextResponse.json(
        { error: 'service query param is required' },
        { status: 400 }
      );
    }

    const baseUrl = SERVICE_MAP[service];
    if (!baseUrl) {
      return NextResponse.json(
        { error: `Unknown service: ${service}. Valid: ${Object.keys(SERVICE_MAP).join(', ')}` },
        { status: 400 }
      );
    }

    const targetUrl = new URL(path, baseUrl).toString();

    const response = await fetch(targetUrl, {
      headers: {
        'Accept': request.headers.get('Accept') || '*/*',
      },
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Inject base href so relative assets resolve correctly
      const baseTag = `<base href="${baseUrl}/">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
      } else {
        html = baseTag + html;
      }

      const headers = new Headers();
      headers.set('Content-Type', contentType);
      // Strip framing restrictions
      // (intentionally not copying X-Frame-Options or Content-Security-Policy)
      response.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower !== 'x-frame-options' && lower !== 'content-security-policy') {
          headers.set(key, value);
        }
      });

      return new NextResponse(html, { status: response.status, headers });
    }

    // Non-HTML: pass through as-is
    const headers = new Headers();
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== 'x-frame-options' && lower !== 'content-security-policy') {
        headers.set(key, value);
      }
    });

    return new NextResponse(response.body, { status: response.status, headers });
  } catch (error) {
    return NextResponse.json(
      { error: `Proxy request failed: ${error}` },
      { status: 502 }
    );
  }
}
