import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function AlertmanagerPage() {
  return (
    <EmbedPage
      title="Alertmanager"
      externalUrl={config.services.alertmanager}
      description="Alert routing and notification management"
    />
  );
}
