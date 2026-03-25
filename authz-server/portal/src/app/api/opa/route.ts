import { NextRequest, NextResponse } from 'next/server';
import { OPA_URL } from '@/lib/config';

// Proxy to OPA — GET for fetching data/policies, POST for evaluations
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') || '';
  try {
    const res = await fetch(`${OPA_URL}${path}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'OPA unreachable' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') || '/v1/data/authz/allow';
  try {
    const body = await req.json();
    const res = await fetch(`${OPA_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'OPA unreachable' }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') || '';
  try {
    const body = await req.text();
    const res = await fetch(`${OPA_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'OPA unreachable' }, { status: 502 });
  }
}
