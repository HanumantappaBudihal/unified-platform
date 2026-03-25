import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function PrometheusPage() {
  return (
    <EmbedPage
      title="Prometheus"
      externalUrl={config.services.prometheus}
      description="Raw metrics and alerting rules for the storage cluster"
    />
  );
}
