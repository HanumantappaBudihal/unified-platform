'use client';

import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function GrafanaPage() {
  return (
    <EmbedPage
      title="Grafana"
      service="grafana"
      externalUrl={config.services.grafana}
    />
  );
}
