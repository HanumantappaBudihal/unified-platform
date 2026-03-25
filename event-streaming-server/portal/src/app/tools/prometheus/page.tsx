import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function PrometheusPage() {
  return (
    <EmbedPage
      title="Prometheus"
      description="Metrics explorer, alert rules, scrape targets"
      service="prometheus"
      externalUrl={config.services.prometheus}
    />
  );
}
