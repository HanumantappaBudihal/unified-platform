import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET() {
  try {
    const res = await fetch(`${config.kafka.restProxy}/brokers`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch brokers' }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
