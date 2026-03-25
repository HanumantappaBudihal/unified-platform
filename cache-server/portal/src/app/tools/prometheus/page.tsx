'use client';

import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function PrometheusPage() {
  return (
    <EmbedPage
      title="Prometheus"
      service="prometheus"
      externalUrl={config.services.prometheus}
    />
  );
}
