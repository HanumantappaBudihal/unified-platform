import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

const REST_PROXY = config.kafka.restProxy;

// GET /api/topics — list all topics with details
export async function GET(request: NextRequest) {
  try {
    const prefix = request.nextUrl.searchParams.get('prefix');

    const res = await fetch(`${REST_PROXY}/topics`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 502 });

    let topics: string[] = await res.json();

    // Filter by prefix if provided (team view)
    if (prefix) {
      topics = topics.filter((t) => t.startsWith(prefix));
    }

    // Filter out internal topics by default
    const showInternal = request.nextUrl.searchParams.get('internal') === 'true';
    if (!showInternal) {
      topics = topics.filter((t) => !t.startsWith('_'));
    }

    // Get details for each topic
    const topicDetails = await Promise.all(
      topics.map(async (name) => {
        try {
          const detailRes = await fetch(`${REST_PROXY}/topics/${encodeURIComponent(name)}`, { cache: 'no-store' });
          if (!detailRes.ok) return { name, partitions: 0, replication: 0, isDlq: name.endsWith('.dlq') };
          const detail = await detailRes.json();
          return {
            name,
            partitions: detail.partitions?.length || 0,
            replication: detail.partitions?.[0]?.replicas?.length || 0,
            isDlq: name.endsWith('.dlq'),
          };
        } catch {
          return { name, partitions: 0, replication: 0, isDlq: name.endsWith('.dlq') };
        }
      })
    );

    return NextResponse.json({ topics: topicDetails });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/topics — create a new topic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, partitions = 3, replicationFactor = 1 } = body;

    if (!name) return NextResponse.json({ error: 'Topic name is required' }, { status: 400 });

    // Validate naming convention: domain.app.event
    const namingRegex = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){1,3}(\.dlq)?$/;
    if (!namingRegex.test(name)) {
      return NextResponse.json(
        { error: 'Topic name must follow pattern: domain.app.event (lowercase, dots as separators)' },
        { status: 400 }
      );
    }

    // Use Kafka REST Proxy doesn't support topic creation directly.
    // We'll produce a dummy message to check if it exists, or use admin API.
    // For now, return instructions since REST Proxy can't create topics.
    // Topic creation should go through Kafka UI or CLI.
    return NextResponse.json(
      {
        message: `Topic "${name}" creation requested`,
        note: 'Use Kafka UI or CLI to create topics (auto-creation is disabled)',
        cli: `docker exec kafka-central /opt/kafka/bin/kafka-topics.sh --create --bootstrap-server localhost:9092 --topic ${name} --partitions ${partitions} --replication-factor ${replicationFactor}`,
      },
      { status: 202 }
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
