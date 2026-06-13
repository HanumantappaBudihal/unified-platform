import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PLATFORM_API = process.env.PLATFORM_API_URL || 'http://localhost:3020';

// Forward auth to the Platform API. Priority:
//   1. Keycloak SSO access token from the NextAuth session (human login)
//   2. per-tenant API token from the sign-in cookie
//   3. server-side superadmin token fallback
async function buildHeaders(req: NextRequest, extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  const session: any = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
  const cookieToken = req.cookies.get('platform_token')?.value;
  const token = session?.accessToken || cookieToken || process.env.PLATFORM_API_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Superadmin-only: select a tenant via cookie when not using a scoped token.
  const tenant = req.cookies.get('platform_tenant')?.value;
  if (tenant && !session?.accessToken && !cookieToken) headers['x-tenant'] = tenant;
  return headers;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${PLATFORM_API}/api/v1/${path.join('/')}${req.nextUrl.search}`;
  try {
    const res = await fetch(url, { cache: 'no-store', headers: await buildHeaders(req) });
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
      headers: await buildHeaders(req, { 'Content-Type': 'application/json' }),
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
    const res = await fetch(url, { method: 'DELETE', headers: await buildHeaders(req) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Platform API unavailable' }, { status: 502 });
  }
}
