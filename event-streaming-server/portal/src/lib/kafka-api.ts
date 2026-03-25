import { config } from './config';

const REST_PROXY = config.kafka.restProxy;

export interface TopicInfo {
  name: string;
  configs: Record<string, string>;
  partitions: { partition: number; leader: number; replicas: { broker: number }[] }[];
}

export interface ProduceResult {
  offsets: { partition: number; offset: number; error_code: number | null }[];
}

export interface ConsumedMessage {
  topic: string;
  key: string | null;
  value: unknown;
  partition: number;
  offset: number;
}

// ---- Topics ----

export async function listTopics(): Promise<string[]> {
  const res = await fetch(`${REST_PROXY}/topics`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to list topics: ${res.status}`);
  return res.json();
}

export async function getTopicDetails(topic: string): Promise<TopicInfo> {
  const res = await fetch(`${REST_PROXY}/topics/${encodeURIComponent(topic)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to get topic: ${res.status}`);
  return res.json();
}

// ---- Produce ----

export async function produceMessages(
  topic: string,
  records: { key?: string; value: unknown }[]
): Promise<ProduceResult> {
  const res = await fetch(`${REST_PROXY}/topics/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.kafka.json.v2+json' },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(`Failed to produce: ${res.status}`);
  return res.json();
}

// ---- Consume (stateless single-poll) ----

export async function consumeMessages(
  topic: string,
  maxMessages: number = 10
): Promise<ConsumedMessage[]> {
  const groupId = `portal-consumer-${Date.now()}`;
  const instanceId = `portal-instance-${Date.now()}`;

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
  if (!createRes.ok) throw new Error(`Failed to create consumer: ${createRes.status}`);

  const baseUri = (await createRes.json()).base_uri as string;

  try {
    // Subscribe
    await fetch(`${baseUri}/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.kafka.v2+json' },
      body: JSON.stringify({ topics: [topic] }),
    });

    // Poll (first poll triggers rebalance, may return empty)
    await fetch(`${baseUri}/records`, {
      headers: { Accept: 'application/vnd.kafka.json.v2+json' },
    });

    // Second poll gets actual data
    const pollRes = await fetch(`${baseUri}/records?max_bytes=1000000`, {
      headers: { Accept: 'application/vnd.kafka.json.v2+json' },
    });

    const messages: ConsumedMessage[] = await pollRes.json();
    return messages.slice(0, maxMessages);
  } finally {
    // Cleanup consumer
    await fetch(baseUri, { method: 'DELETE', headers: { 'Content-Type': 'application/vnd.kafka.v2+json' } }).catch(() => {});
  }
}

// ---- Health ----

export interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'checking';
}

export async function checkServiceHealth(name: string, url: string): Promise<ServiceHealth> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);
    return { name, url, status: res.ok ? 'healthy' : 'unhealthy' };
  } catch {
    return { name, url, status: 'unhealthy' };
  }
}

// ---- Broker Info ----

export async function getBrokers(): Promise<{ brokers: number[] }> {
  const res = await fetch(`${REST_PROXY}/brokers`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to get brokers: ${res.status}`);
  return res.json();
}
