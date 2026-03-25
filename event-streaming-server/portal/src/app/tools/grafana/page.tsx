import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function GrafanaPage() {
  return (
    <EmbedPage
      title="Grafana"
      description="Monitoring dashboards, consumer lag, throughput metrics"
      service="grafana"
      externalUrl={config.services.grafana}
    />
  );
}
