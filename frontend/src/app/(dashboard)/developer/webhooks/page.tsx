'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { WebhookConfig } from '@/components/developer/WebhookConfig';

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Developer', href: '/developer' },
          { label: 'Webhooks' },
        ]}
      />
      <PageHeader
        title="Webhook Endpoints"
        subtitle="Receive real-time event notifications when payroll events occur"
      />
      <WebhookConfig />
    </div>
  );
}
