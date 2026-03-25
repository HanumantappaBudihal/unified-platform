import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const REST_PROXY = config.kafka.restProxy;

// POST /api/consume — consume messages from a topic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, maxMessages = 10 } = body;

    if (!topic) return NextResponse.json({ error: 'Topic is required' }, { status: 400 });

    const groupId = `portal-${Date.now()}`;
    const instanceId = `inst-${Date.now()}`;

    // Create consumer
    const createRes = await fetch(`${REST_PROXY}/consumers/${groupId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.kafka.v2+json' },
      body: JSON.stringify({
        name: instanceId,
        format: 'json',
        'auto.offset.reset': 'earliest',
        'auto.commit.enable': 'false',
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `Failed to create consumer: ${errText}` }, { status: 502 });
    }

    const { base_uri } = await createRes.json();

    try {
      // Subscribe
      await fetch(`${base_uri}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.kafka.v2+json' },
        body: JSON.stringify({ topics: [topic] }),
      });

      // First poll (triggers rebalance)
      await fetch(`${base_uri}/records`, {
        headers: { Accept: 'application/vnd.kafka.json.v2+json' },
      });

      // Second poll (gets data)
      const pollRes = await fetch(`${base_uri}/records?max_bytes=1000000`, {
        headers: { Accept: 'application/vnd.kafka.json.v2+json' },
      });

      const messages = await pollRes.json();

      return NextResponse.json({
        topic,
        messages: messages.slice(0, maxMessages),
        count: Math.min(messages.length, maxMessages),
      });
    } finally {
      // Cleanup
      await fetch(base_uri, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/vnd.kafka.v2+json' },
      }).catch(() => {});
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
