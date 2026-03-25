import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_API = process.env.PLATFORM_API_URL || 'http://localhost:3020';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = `${PLATFORM_API}/api/v1/${path.join('/')}${req.nextUrl.search}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
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
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Platform API unavailable' }, { status: 502 });
  }
}
