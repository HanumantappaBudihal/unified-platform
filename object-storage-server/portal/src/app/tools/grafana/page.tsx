import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function GrafanaPage() {
  return (
    <EmbedPage
      title="Grafana"
      externalUrl={config.services.grafana}
      description="Storage metrics — disk usage, request rates, latency, and throughput"
    />
  );
}
