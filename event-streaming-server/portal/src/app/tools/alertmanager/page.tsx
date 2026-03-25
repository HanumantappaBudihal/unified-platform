import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function AlertmanagerPage() {
  return (
    <EmbedPage
      title="Alertmanager"
      description="Active alerts, silences, notification routing"
      service="alertmanager"
      externalUrl={config.services.alertmanager}
    />
  );
}
