'use client';

import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function RedisInsightPage() {
  return (
    <EmbedPage
      title="Redis Insight"
      service="redis-insight"
      externalUrl={config.services.redisInsight}
    />
  );
}
