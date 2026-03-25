import { NextResponse } from 'next/server';
import { OPA_URL } from '@/lib/config';

export async function GET() {
  try {
    const res = await fetch(`${OPA_URL}/health`, { cache: 'no-store' });
    return NextResponse.json({ opa: res.ok ? 'healthy' : 'unhealthy' });
  } catch {
    return NextResponse.json({ opa: 'offline' });
  }
}
