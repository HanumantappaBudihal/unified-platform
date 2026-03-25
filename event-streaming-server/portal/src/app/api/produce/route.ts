import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const REST_PROXY = config.kafka.restProxy;

// POST /api/produce — produce messages to a topic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, key, value } = body;

    if (!topic) return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    if (value === undefined) return NextResponse.json({ error: 'Value is required' }, { status: 400 });

    // Parse value as JSON if it's a string that looks like JSON
    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
    }

    const records = key
      ? [{ key, value: parsedValue }]
      : [{ value: parsedValue }];

    const res = await fetch(`${REST_PROXY}/topics/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.kafka.json.v2+json' },
      body: JSON.stringify({ records }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Produce failed: ${errText}` }, { status: 502 });
    }

    const result = await res.json();
    return NextResponse.json({
      success: true,
      topic,
      offsets: result.offsets,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
