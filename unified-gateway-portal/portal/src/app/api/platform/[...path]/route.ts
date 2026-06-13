import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_API = process.env.PLATFORM_API_URL || 'http://localhost:3020';

// Forward auth to the Platform API. Prefer the per-tenant token from the session
// cookie; fall back to the server-side superadmin token. When acting as superadmin
// (no tenant cookie token), an optional platform_tenant cookie selects the tenant.
function buildHeaders(req: NextRequest, extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const cookieToken = req.cookies.get('platform_token')?.value;
  const token = cookieToken || process.env.PLATFORM_API_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const tenant = req.cookies.get('platform_tenant')?.value;
  if (tenant && !cookieToken) headers['x-tenant'] = tenant;
  return headers;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${PLATFORM_API}/api/v1/${path.join('/')}${req.nextUrl.search}`;
  try {
    const res = await fetch(url, { cache: 'no-store', headers: buildHeaders(req) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Platform API unavailable' }, { status: 502 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${PLATFORM_API}/api/v1/${path.join('/')}`;
  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(req, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Platform API unavailable' }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${PLATFORM_API}/api/v1/${path.join('/')}${req.nextUrl.search}`;
  try {
    const res = await fetch(url, { method: 'DELETE', headers: buildHeaders(req) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Platform API unavailable' }, { status: 502 });
  }
}
