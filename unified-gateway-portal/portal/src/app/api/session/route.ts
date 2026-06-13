import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_API = process.env.PLATFORM_API_URL || 'http://localhost:3020';

async function whoami(token: string) {
  const res = await fetch(`${PLATFORM_API}/api/v1/whoami`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

// Current session identity (from the tenant cookie, or the superadmin fallback).
export async function GET(req: NextRequest) {
  const cookieToken = req.cookies.get('platform_token')?.value;
  const token = cookieToken || process.env.PLATFORM_API_TOKEN;
  if (!token) return NextResponse.json({ authenticated: false });
  const me = await whoami(token);
  if (!me) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: true, viaCookie: !!cookieToken, ...me });
}

// Sign in with a tenant API token: verify it, then store it httpOnly.
export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  const me = await whoami(token);
  if (!me) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const out = NextResponse.json({ ok: true, ...me });
  out.cookies.set('platform_token', token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
  });
  return out;
}

// Sign out — clear the tenant token (reverts to the superadmin/default view).
export async function DELETE() {
  const out = NextResponse.json({ ok: true });
  out.cookies.set('platform_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return out;
}
