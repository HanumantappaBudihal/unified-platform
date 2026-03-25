import EmbedPage from '@/components/EmbedPage';
import { config } from '@/lib/config';

export default function ConsolePage() {
  return (
    <EmbedPage
      title="MinIO Console"
      externalUrl={config.services.minioConsole}
      description="Native MinIO management console — buckets, users, policies, and diagnostics"
    />
  );
}
