import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function KafkaUiPage() {
  return (
    <EmbedPage
      title="Kafka UI"
      description="Full topic management, consumer groups, schemas, RBAC"
      service="kafka-ui"
      externalUrl={config.services.kafkaUi}
    />
  );
}
