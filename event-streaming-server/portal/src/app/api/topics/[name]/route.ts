import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const REST_PROXY = config.kafka.restProxy;

// GET /api/topics/[name] — get topic details
export async function GET(_request: NextRequest, { params }: { params: { name: string } }) {
  try {
    const res = await fetch(`${REST_PROXY}/topics/${encodeURIComponent(params.name)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ error: `Topic not found: ${params.name}` }, { status: 404 });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
