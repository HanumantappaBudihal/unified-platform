'use client';

import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function AlertmanagerPage() {
  return (
    <EmbedPage
      title="Alertmanager"
      service="alertmanager"
      externalUrl={config.services.alertmanager}
    />
  );
}
